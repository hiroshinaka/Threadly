const express = require('express');
const router = express.Router();
const pool = require('../database/connections/databaseConnection');
const multer = require('multer');
const threadsRouter = require('./threads');
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
// GET /categories - list categories
router.get('/categories', async (req, res) => {
	try {
		const [rows] = await pool.query('SELECT categories_id, name, text_allow, photo_allow, slug FROM categories ORDER BY name ASC');
		res.json({ ok: true, categories: rows });
	} catch (err) {
		console.error('Error fetching categories', err);
		res.status(500).json({ ok: false, message: 'Database error' });
	}
});

// GET /search?q=...&limit=20&offset=0
router.get('/search', async (req, res) => {
	try {
		const q = (req.query.q || '').trim();
		const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
		const offset = parseInt(req.query.offset, 10) || 0;
		if (!q) return res.status(400).json({ ok: false, message: 'q (query) is required' });

		// Fulltext search works best for queries of length >= 3. For very short queries use LIKE fallback.
		let rows = [];
		if (q.length >= 3) {
			const sql = `SELECT thread_id, title, slug, body, karma, created_at, category_id, MATCH(title, body_text) AGAINST(? IN NATURAL LANGUAGE MODE) AS score
						 FROM thread
						 WHERE MATCH(title, body_text) AGAINST(? IN NATURAL LANGUAGE MODE)
						 ORDER BY score DESC
						 LIMIT ? OFFSET ?`;
			const [r] = await pool.query(sql, [q, q, limit, offset]);
			rows = r;
		}

		// fallback to LIKE if fulltext returned nothing or query too short
		if (rows.length === 0) {
			const likeQ = `%${q}%`;
			const sql2 = `SELECT thread_id, title, slug, body, karma, created_at, category_id
						  FROM thread
						  WHERE title LIKE ? OR body_text LIKE ?
						  ORDER BY created_at DESC
						  LIMIT ? OFFSET ?`;
			const [r2] = await pool.query(sql2, [likeQ, likeQ, limit, offset]);
			rows = r2;
		}

		res.json({ ok: true, query: q, count: rows.length, threads: rows });
	} catch (err) {
		console.error('Search error', err);
		res.status(500).json({ ok: false, message: 'Search failed' });
	}
});
// Mount the threads router (provides GET /api/threads and thread detail endpoints)

router.use('/threads', threadsRouter);

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
	const [catRows] = await pool.query('SELECT categories_id, name, text_allow, photo_allow FROM categories WHERE categories_id = ?', [category_id]);
		if (!catRows.length) return res.status(400).json({ ok: false, message: 'Invalid category' });
		const category = catRows[0];

		let bodyToSave = null;

		if (req.file) {
			if (!category.photo_allow) {
				return res.status(400).json({ ok: false, message: 'This category does not allow image posts' });
			}
			// upload buffer to cloudinary
			const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
			const uploadResult = await cloudinary.uploader.upload(dataUri, {
				folder: 'threadly',
				resource_type: 'image',
				eager: [{ width: 400, height: 300, crop: 'fill' }],
				eager_async: false,
			});

			// Cloudinary may or may not return eager results immediately depending on the account/config.
			// Build a reliable thumbnail URL: prefer eager[0], otherwise build transformation URL from public_id.
			let thumb = null;
			if (uploadResult && uploadResult.eager && uploadResult.eager[0] && uploadResult.eager[0].secure_url) {
				thumb = uploadResult.eager[0].secure_url;
			} else if (uploadResult && uploadResult.public_id) {
				try {
					thumb = cloudinary.url(uploadResult.public_id, { width: 400, height: 300, crop: 'fill', secure: true });
				} catch (e) {
					thumb = null;
				}
			}

			// allow an optional text/description alongside the image if the category permits
			let imageBody = { type: 'image', url: uploadResult.secure_url, thumbnail_url: thumb, width: uploadResult.width, height: uploadResult.height, public_id: uploadResult.public_id };
			if (typeof text === 'string' && text.trim().length > 0 && category.text_allow) {
				imageBody.text = text.trim();
			}
			bodyToSave = JSON.stringify(imageBody);
		} else {
			if (!category.text_allow) return res.status(400).json({ ok: false, message: 'This category does not allow text posts' });
			if (!text || text.trim().length === 0) return res.status(400).json({ ok: false, message: 'Text body is required for text posts' });
			bodyToSave = text.trim();
		}
	// Determine searchable plain-text for body_text column (used by FULLTEXT search)
	let bodyText = null;
	try {
		const parsed = JSON.parse(bodyToSave);
		if (parsed && typeof parsed.text === 'string' && parsed.text.trim().length > 0) bodyText = parsed.text.trim();
	} catch (e) {
		// not JSON — treat bodyToSave as plain text
		if (typeof bodyToSave === 'string' && bodyToSave.trim().length > 0) bodyText = bodyToSave.trim();
	}

	//Insert thread into database (pass body_text so it's searchable)
	const created = await createThread(pool, title.trim(), bodyToSave, author_id, category.categories_id, bodyText);
	// createThread returns { thread_id, slug }
	res.status(201).json({ ok: true, thread_id: created.thread_id, slug: created.slug });
	} catch (err) {
		console.error('Error creating thread', err);
		res.status(500).json({ ok: false, message: 'Database error' });
	}
});



module.exports = router;