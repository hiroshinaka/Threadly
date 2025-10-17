const express = require('express');
const router = express.Router();

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

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ ok: false, message: 'Logout failed' });
        res.json({ ok: true, message: 'Logged out successfully' });
    });
});


module.exports = router;