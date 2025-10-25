const express = require('express');
const router = express.Router();
const pool = require('../database/connections/databaseConnection');
const { voteThread } = require('../database/dbQueries/reactionQuery');
const { fetchThreadFrontPage, fetchThreadById, fetchComments } = require('../database/dbQueries/threadQuery');

// GET /threads - list recent threads 
router.get('/', async (req, res) => {
  try {
    const threads = await fetchThreadFrontPage(pool, 50);
    res.json({ ok: true, threads });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'DB error' });
  }
});

// GET /threads/:thread_id - fetch a thread with nested comments
router.get('/:thread_id', async (req, res) => {
  const { thread_id } = req.params;
  try {
    const rows = await fetchThreadById(pool, thread_id);
    if (!rows || !rows.length) return res.status(404).json({ ok: false, message: 'Thread not found' });
    const thread = rows[0];
    const comments = await fetchComments(thread_id);
    res.json({ ok: true, thread, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'DB error' });
  }
});

// POST /threads/:thread_id/comments - add a comment or reply
router.post('/:thread_id/comments', async (req, res) => {
  const { thread_id } = req.params;
  const { text, parent_id } = req.body;
  // prefer session user id if available
  const author_id = (req.session && req.session.user && req.session.user.id) || req.body.author_id;
  if (!author_id || !text) return res.status(400).json({ ok: false, message: 'author_id and text required (login first)' });
  try {
    // ensure thread exists
    const [trows] = await pool.query('SELECT thread_id FROM thread WHERE thread_id = ?', [thread_id]);
    if (!trows.length) return res.status(404).json({ ok: false, message: 'Thread not found' });

    const [result] = await pool.query(
      `INSERT INTO comment (text, parent_id, author_id, thread_id) VALUES (?, ?, ?, ?)`,
      [text, parent_id || null, author_id, thread_id]
    );
    const insertedId = result.insertId;
    res.status(201).json({ ok: true, comment_id: insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'DB error' });
  }
});

// POST /threads/:thread_id/vote - cast or remove a vote
router.post('/:thread_id/vote', async (req, res) => {
  try {
    const { thread_id } = req.params;
    const userId = req.session && req.session.user && req.session.user.id;
    if (!userId) return res.status(401).json({ ok: false, message: 'Login required' });
    let { value } = req.body;
    value = Number(value);
    if (![1, -1, 0].includes(value)) return res.status(400).json({ ok: false, message: 'Invalid vote value' });

    const result = await voteThread(pool, userId, Number(thread_id), value);
    res.json({ ok: true, karma: result.karma, delta: result.delta });
  } catch (err) {
    console.error('Vote error', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// POST /comments/:comment_id/vote - cast or remove a vote on a comment
router.post('/comments/:comment_id/vote', async (req, res) => {
  try {
    const { comment_id } = req.params;
    const userId = req.session && req.session.user && req.session.user.id;
    if (!userId) return res.status(401).json({ ok: false, message: 'Login required' });
    let { value } = req.body;
    value = Number(value);
    if (![1, -1, 0].includes(value)) return res.status(400).json({ ok: false, message: 'Invalid vote value' });

    const { voteComment } = require('../database/dbQueries/reactionQuery');
    const result = await voteComment(pool, userId, Number(comment_id), value);
    res.json({ ok: true, karma: result.karma, delta: result.delta });
  } catch (err) {
    console.error('Comment vote error', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
