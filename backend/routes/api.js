const express = require('express');
const router = express.Router();
const pool = require('../database/connections/databaseConnection');
const multer = require('multer');
const threadsRouter = require('./threads');
const cloudinary = require('cloudinary').v2;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6*1024*1024 } });
const { createCategory, searchCategoriesByName } = require('../database/dbQueries/categoriesQuery');
const { createThread, insertThreadMedia } = require('../database/dbQueries/threadQuery');
const { createUser, getUserByUsername, getUserWithPassword, updateUserImage } = require('../database/dbQueries/userQuery');
const { shouldRecordView, insertViewEvent, incrementThreadViewCount, hashIp } = require('../database/dbQueries/viewQuery');
const { addSubscription, removeSubscription, listSubscriptionsForUser } = require('../database/dbQueries/subscriptionQuery');

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

router.get('/me', async (req, res) => {
	try {
		if (!req.session || !req.session.user || !req.session.user.id) {
			return res.json({ ok: false });
		}
		const userId = req.session.user.id;
		const [rows] = await pool.query('SELECT id, username, role_id, image_url FROM user WHERE id = ?', [userId]);
		if (!rows.length) return res.json({ ok: false });
		// update session user to include image_url so subsequent requests have it
		req.session.user = { ...req.session.user, image_url: rows[0].image_url };
		return res.json({ ok: true, user: req.session.user });
	} catch (err) {
		console.error('Error in /me', err);
		return res.status(500).json({ ok: false });
	}
});

// GET /api/profile/me - returns posts and comments for the logged-in user
router.get('/profile/me', async (req, res) => {
	try {
		if (!req.session || !req.session.user || !req.session.user.id) {
			return res.status(401).json({ ok: false, message: 'Unauthorized' });
		}
		const userId = req.session.user.id;
		const posts = await fetchUserPosts(pool, userId, 500);
		const comments = await fetchUserComments(pool, userId, 500);
		const counts = await fetchUserContribCounts(pool, userId);
		// attach current session user data (including image_url if set) so frontend can show avatar
		const sessionUser = req.session.user || {};
		res.json({ ok: true, posts, comments, counts, sessionUser });
	} catch (err) {
		console.error('Error fetching profile data', err);
		res.status(500).json({ ok: false, message: 'Failed to fetch profile data' });
	}
});

// POST /api/profile/avatar - upload avatar image and persist to user.image_url
router.post('/profile/avatar', upload.single('avatar'), async (req, res) => {
	try {
		if (!req.session || !req.session.user || !req.session.user.id) {
			return res.status(401).json({ ok: false, message: 'Unauthorized' });
		}

		const userId = req.session.user.id;

		if (!req.file) {
			return res.status(400).json({ ok: false, message: 'No file uploaded' });
		}

		// upload buffer to cloudinary
		const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
		const uploadResult = await cloudinary.uploader.upload(dataUri, {
			folder: 'threadly/avatars',
			resource_type: 'image',
			transformation: [{ width: 800, height: 800, crop: 'limit' }]
		});

		// persist to DB
		const updatedUser = await updateUserImage(pool, userId, uploadResult.secure_url);

		// update session user so /api/me reflects new image
		if (req.session && req.session.user) {
			req.session.user.image_url = updatedUser.image_url;
		}

		res.json({ ok: true, user: updatedUser });
	} catch (err) {
		console.error('Avatar upload failed', err);
		res.status(500).json({ ok: false, message: 'Avatar upload failed' });
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

// POST /categories/:id/subscribe - subscribe logged-in user to a category
router.post('/categories/:id/subscribe', async (req, res) => {
	try {
		const userId = req.session && req.session.user && req.session.user.id;
		if (!userId) return res.status(401).json({ ok: false, message: 'Please log in to subscribe' });
		const categoryId = Number(req.params.id);
		if (!categoryId) return res.status(400).json({ ok: false, message: 'Invalid category id' });
		const ok = await addSubscription(pool, userId, categoryId);
		res.json({ ok: true, subscribed: ok });
	} catch (err) {
		console.error('Subscribe error', err);
		res.status(500).json({ ok: false, message: 'DB error' });
	}
});

// DELETE /categories/:id/subscribe - unsubscribe logged-in user from a category
router.delete('/categories/:id/subscribe', async (req, res) => {
	try {
		const userId = req.session && req.session.user && req.session.user.id;
		if (!userId) return res.status(401).json({ ok: false, message: 'Please log in to unsubscribe' });
		const categoryId = Number(req.params.id);
		if (!categoryId) return res.status(400).json({ ok: false, message: 'Invalid category id' });
		const ok = await removeSubscription(pool, userId, categoryId);
		res.json({ ok: true, unsubscribed: ok });
	} catch (err) {
		console.error('Unsubscribe error', err);
		res.status(500).json({ ok: false, message: 'DB error' });
	}
});

// GET /me/subscriptions - list the current user's subscriptions
router.get('/me/subscriptions', async (req, res) => {
	try {
		const userId = req.session && req.session.user && req.session.user.id;
		if (!userId) return res.status(401).json({ ok: false, message: 'Not logged in' });
		const subs = await listSubscriptionsForUser(pool, userId);
		res.json({ ok: true, subscriptions: subs });
	} catch (err) {
		console.error('List subs error', err);
		res.status(500).json({ ok: false, message: 'DB error' });
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
			const sql = `SELECT thread_id, title, slug, body_text, karma, created_at, category_id, MATCH(title, body_text) AGAINST(? IN NATURAL LANGUAGE MODE) AS score
						 FROM thread
						 WHERE MATCH(title, body_text) AGAINST(? IN NATURAL LANGUAGE MODE)
						 ORDER BY score DESC
						 LIMIT ? OFFSET ?`;
			const [r] = await pool.query(sql, [q, q, limit, offset]);
			rows = r;
		}

		if (rows.length === 0) {
			const likeQ = `%${q}%`;
			const sql2 = `SELECT thread_id, title, slug, body_text, karma, created_at, category_id
													FROM thread
													WHERE title LIKE ? OR body_text LIKE ?
													ORDER BY created_at DESC
													LIMIT ? OFFSET ?`;
			const [r2] = await pool.query(sql2, [likeQ, likeQ, limit, offset]);
			rows = r2;
		}

			// --- also search comments (returns comment matches separately) ---
			let commentRows = [];
			try {
				if (q.length >= 3) {
					const csql = `SELECT comment_id, text, u.username AS author_username, thread_id, author_id, created_at, MATCH(text) AGAINST(? IN NATURAL LANGUAGE MODE) AS score
												FROM comment
												JOIN user u ON
												author_id = u.id
												WHERE MATCH(text) AGAINST(? IN NATURAL LANGUAGE MODE)
												ORDER BY score DESC
												LIMIT ? OFFSET ?`;
					const [cr] = await pool.query(csql, [q, q, limit, offset]);
					commentRows = cr;
				}
				if (commentRows.length === 0) {
					const likeQ = `%${q}%`;
					const csql2 = `SELECT comment_id, u.username AS author_username, text, thread_id, author_id, created_at
												 FROM comment
												 JOIN user u ON
												 author_id = u.id
												 WHERE text LIKE ?
												 ORDER BY created_at DESC
												 LIMIT ? OFFSET ?`;
					const [cr2] = await pool.query(csql2, [likeQ, limit, offset]);
					commentRows = cr2;
				}
			} catch (e) {
				console.error('Comment search failed', e);
				// don't fail the entire search if comments can't be searched for any reason
				commentRows = [];
			}

			res.json({ ok: true, query: q, thread_count: rows.length, threads: rows, comment_count: commentRows.length, comments: commentRows });
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
	let uploadResult = null;

		if (req.file) {
			if (!category.photo_allow) {
				return res.status(400).json({ ok: false, message: 'This category does not allow image posts' });
			}
			// upload buffer to cloudinary
			const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
			uploadResult = await cloudinary.uploader.upload(dataUri, {
				folder: 'threadly',
				resource_type: 'image',
			});

			// Store the original, full-size image URL so the thread view can display the full image.
			let imageBody = { type: 'image', url: uploadResult.secure_url, public_id: uploadResult.public_id };
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
		const created = await createThread(pool, title.trim(), author_id, category.categories_id, bodyText);
		// if we uploaded an image, persist it to thread_media
				if (req.file) {
					try {
						const media = { media_type: 'image', url: uploadResult.secure_url, public_id: uploadResult.public_id };
						if (typeof text === 'string' && text.trim().length > 0 && category.text_allow) media.caption = text.trim();
						await insertThreadMedia(pool, created.thread_id, media);
					} catch (e) {
						console.error('Failed to insert thread media', e);
					}
				}

		// createThread returns { thread_id, slug }
		res.status(201).json({ ok: true, thread_id: created.thread_id, slug: created.slug });
	} catch (err) {
		console.error('Error creating thread', err);
		res.status(500).json({ ok: false, message: 'Database error' });
	}
});



// POST /api/threads/:id/view
router.post('/threads/:id/view', async (req, res) => {
	try {
		const threadId = Number(req.params.id);
		if (!threadId) return res.status(400).json({ ok: false, message: 'Invalid thread id' });

		// determine identifiers for dedupe
		const viewer_id = req.session && req.session.user && req.session.user.id ? req.session.user.id : null;
		const session_id = req.sessionID || (req.cookies && req.cookies['connect.sid']) || null;
		const ipHash = hashIp(req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress);

		// Decide whether to insert a raw event for auditing/dedupe
		const should = await shouldRecordView(pool, { thread_id: threadId, viewer_id, session_id, ip_hash: ipHash, windowMinutes: 60 });

		// Always increment the cached counter so the UI shows an updated total when the client signals a view.
		const newCount = await incrementThreadViewCount(pool, threadId, 1);

		let insertId = null;
		if (should) {
			insertId = await insertViewEvent(pool, { thread_id: threadId, viewer_id, session_id, ip_hash: ipHash });
		}

		res.json({ ok: true, recorded: should, inserted_id: insertId, view_count: newCount });
	} catch (err) {
		console.error('Error recording view', err);
		res.status(500).json({ ok: false, message: 'Failed to record view' });
	}
});



module.exports = router;
