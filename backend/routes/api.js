const express = require('express');
const router = express.Router();

router.get('/ping', (req, res) => {
res.json({ ok: true, message: 'pong', now: new Date().toISOString() });
});

router.post('/echo', (req, res) => {
res.json({ received: req.body });
});

module.exports = router;