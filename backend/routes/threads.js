const express = require('express');
const router = express.Router();
const pool = require('../database/connections/databaseConnection');
const { voteThread } = require('../database/dbQueries/reactionQuery');

// Helper to fetch comments for a thread and nest replies
async function fetchComments(thread_id) {
  const [rows] = await pool.query(
    `SELECT c.comment_id, c.text, c.created_at, c.parent_id, c.author_id, u.username
     FROM comment c
     JOIN user u ON c.author_id = u.id
     WHERE c.thread_id = ?
     ORDER BY c.created_at ASC`,
    [thread_id]
  );

  const byId = {};
  rows.forEach(r => byId[r.comment_id] = { ...r, replies: [] });
  const root = [];
  rows.forEach(r => {
    if (r.parent_id) {
      const parent = byId[r.parent_id];
      if (parent) parent.replies.push(byId[r.comment_id]);
    } else {
      root.push(byId[r.comment_id]);
    }
  });
  return root;
}

// GET /threads - list recent threads 
router.get('/', async (req, res) => {
  try {
    const [threads] = await pool.query(
      `SELECT t.thread_id, t.slug AS thread_slug, t.title, t.body, t.karma, t.is_active, t.created_at, t.category_id,
              c.name AS category_name, c.slug AS category_slug,
              t.author_id, u.username AS author
       FROM thread t
       LEFT JOIN user u ON t.author_id = u.id
       LEFT JOIN categories c ON t.category_id = c.categories_id
       WHERE t.is_active = 1
       ORDER BY t.created_at DESC
       LIMIT 50`
    );
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
    const [rows] = await pool.query(
      `SELECT t.thread_id, t.slug AS thread_slug, t.title, t.body, t.karma, t.is_active, t.created_at, t.category_id, t.author_id, u.username as author
       FROM thread t
       JOIN user u ON t.author_id = u.id
       WHERE t.thread_id = ?`,
      [thread_id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Thread not found' });
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

module.exports = router;
