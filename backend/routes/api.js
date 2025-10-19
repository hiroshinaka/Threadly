const express = require('express');
const router = express.Router();
const pool = require('../database/connections/databaseConnection');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6*1024*1024 } });
const { createCategory, searchCategoriesByName } = require('../database/dbQueries/categoriesQuery');
const { createThread } = require('../database/dbQueries/threadQuery');
const { createUser, getUserByUsername, getUserWithPassword } = require('../database/dbQueries/userQuery');

const bcrypt = require('bcryptjs');
const joi = require('joi');
const saltRounds = 10;

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.get('/ping', (req, res) => {
	res.json({ ok: true, message: 'pong', now: new Date().toISOString() });
});

router.post('/echo', (req, res) => {
	res.json({ received: req.body });
});

router.post('/signup', async (req, res) => {
	try {
		const { username, password } = req.body;

		if (!username || !password) {
			return res.status(400).json({ ok: false, message: 'Username and password required.' });
		}

		const schema = joi.object({
			username: joi.string().alphanum().min(3).max(20).required(),
			password: joi
				.string()
				.min(10)
				.max(30)
				.pattern(
					new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=[\\]{};:"\\\\|,.<>/?]).+$')
				)
				.required()
				.messages({
					'string.pattern.base':
						'Password must include uppercase, lowercase, number, and special character.',
				}),
		});

		const { error } = schema.validate({ username, password });
		if (error) {
			return res.status(400).json({ ok: false, message: error.details[0].message });
		}
		const existingUser = await getUserByUsername(pool, username);
		if (existingUser) {
			return res.status(409).json({ ok: false, message: 'Username already taken.' });
		}

        const default_role_id = 2;
		const hashedPassword = await bcrypt.hash(password, saltRounds);
		await createUser(pool, username, hashedPassword, default_role_id);

		res.json({ ok: true, message: 'Signup successful!' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ ok: false, message: 'Internal server error.' });
	}
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ ok: false, message: 'Username and password required.' });
        }

        const user = await getUserWithPassword(pool, username);
        
        if (!user) {
            return res.status(401).json({ ok: false, message: 'Invalid username or password.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isPasswordValid) {
            return res.status(401).json({ ok: false, message: 'Invalid username or password.' });
        }

        // session data here 
        req.session.user = { 
            id: user.id,
            username: user.username,
            role_id: user.role_id
        };

        res.json({ 
            ok: true, 
            message: 'Login successful!', 
            user: req.session.user 
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ ok: false, message: 'Failed to logout.' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ ok: true, message: 'Logout successful!' });
    });
});

router.post('/categories', async (req, res) => {
	const { name, description , text_allow , photo_allow } = req.body;

	// choose admin_id from session user if available, otherwise default to 1 (assumes seeded admin user)
	let admin_id;
	if (req.session && req.session.user && req.session.user.id){
		admin_id = req.session.user.id;
	} else {
		return res.status(401).json({ ok: false, message: 'Unauthorized: Please log in to create a category.' });
	}


	try {
		const checkExistingThreads = await searchCategoriesByName(pool, name.trim());
        if (checkExistingThreads.length > 0) {
            return res.status(409).json({ ok: false, message: 'Category with this name already exists.' });
        }
		const created = await createCategory(pool, name.trim(), admin_id, Number(text_allow) ? 1 : 0, Number(photo_allow) ? 1 : 0, description ? description.trim() : null);
		res.status(201).json({ ok: true, category: created });
	} catch (err) {
		console.error('Error creating category', err);
		res.status(500).json({ ok: false, message: 'Database error' });
	}

});
//TODO: Implement thread creation
router.post('/threads', upload.single('image'), async (req, res) => {
	try {
		const { title, text, category_id } = req.body;
		//Check user is logged in 
		let author_id = null;
		if (req.session && req.session.user && req.session.user.id) {
			author_id = req.session.user.id;
		} else {
			return res.status(401).json({ ok: false, message: 'Unauthorized: Please log in to create a thread.' });
		}
		//Check for empty fields
		if (!title || !category_id) {
			return res.status(400).json({ ok: false, message: 'title and category_id are required.' });
		}

		// fetch category
		const [catRows] = await pool.query('SELECT categories_id, name, text_allow, photo_allow FROM categories WHERE categories_id = ? OR slug = ?', [category_id, category_id]);
		if (!catRows.length) return res.status(400).json({ ok: false, message: 'Invalid category' });
		const category = catRows[0];

		let bodyToSave = null;

		if (req.file) {
			if (!category.photo_allow) {
				return res.status(400).json({ ok: false, message: 'This category does not allow image posts' });
			}
			// upload buffer to cloudinary
			const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
			const uploadResult = await cloudinary.uploader.upload(dataUri, { folder: 'threadly' });
			bodyToSave = JSON.stringify({ type: 'image', url: uploadResult.secure_url, width: uploadResult.width, height: uploadResult.height });
		} else {
			if (!category.text_allow) return res.status(400).json({ ok: false, message: 'This category does not allow text posts' });
			if (!text || text.trim().length === 0) return res.status(400).json({ ok: false, message: 'Text body is required for text posts' });
			bodyToSave = text.trim();
		}
		//Insert thread into database
		const threadId = await createThread(pool, title.trim(), bodyToSave, author_id, category.categories_id);
		res.status(201).json({ ok: true, thread_id: threadId });
	} catch (err) {
		console.error('Error creating thread', err);
		res.status(500).json({ ok: false, message: 'Database error' });
	}
});



module.exports = router;