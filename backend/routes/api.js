const express = require('express');
const router = express.Router();
const pool = require('../database/connections/databaseConnection');
const { createCategory, searchCategoriesByName } = require('../database/dbQueries/categoriesQuery');
const users = [];

router.get('/ping', (req, res) => {
	res.json({ ok: true, message: 'pong', now: new Date().toISOString() });
});

router.post('/echo', (req, res) => {
	res.json({ received: req.body });
});

router.post('/signup', (req, res) => {
	const { username, password } = req.body;
	if (!username || !password) {
		return res.status(400).json({ ok: false, message: 'Username and password required.' });
	}
	if (users.find(u => u.username === username)) {
		return res.status(409).json({ ok: false, message: 'Username already exists.' });
	}
	users.push({ username, password });
	res.json({ ok: true, message: 'Signup successful!' });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ ok: false, message: 'Invalid username or password.' });
    }

    req.session.user = { username: user.username };
    res.json({ ok: true, message: 'Login successful!', user: req.session.user });
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
router.post('/threads', async (req, res) => {
    const { title, body, author_id, category_id } = req.body;
});



module.exports = router;