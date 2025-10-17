const express = require('express');
const router = express.Router();
const pool = require('../database/connections/databaseConnection');

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
      `SELECT t.thread_id, t.title, t.is_active, t.created_at, c.name, t.author_id, u.username as author, 
       FROM thread t
       JOIN user u ON t.author_id = u.id
       JOIN category c ON t.category_id = c.id
       JOIN view_events v on t.thread_id = v.thread_id
       JOIN comments cm on t.thread_id = cm.thread_id
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
      `SELECT t.thread_id, t.title, t.body, t.is_active, t.created_at, t.category_id, t.author_id, u.username as author
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
  const { author_id, text, parent_id } = req.body;
  if (!author_id || !text) return res.status(400).json({ ok: false, message: 'author_id and text required' });
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

module.exports = router;
