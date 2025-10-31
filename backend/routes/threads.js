const express = require('express');
const router = express.Router();
const pool = require('../database/connections/databaseConnection');
const { voteThread } = require('../database/dbQueries/reactionQuery');
const { fetchThreadFrontPage, fetchThreadById, fetchComments } = require('../database/dbQueries/threadQuery');
const { fetchThreadsByCategoryIds } = require('../database/dbQueries/threadQuery');
const { deleteCommentAndReplies } = require('../database/dbQueries/commentQuery');

// GET /threads - list recent threads 
router.get('/', async (req, res) => {
  try {
    const userId = req.session && req.session.user && req.session.user.id ? req.session.user.id : null;
    const threads = await fetchThreadFrontPage(pool, 50);
    // if user logged in, attach their vote for each thread so frontend can render vote state
    if (userId && threads && threads.length) {
      try {
        const ids = threads.map(t => t.thread_id);
        const placeholders = ids.map(() => '?').join(',');
        // attempt to read numeric value column; fallback to presence-only
        try {
          const [vr] = await pool.query(`SELECT thread_id, value FROM thread_reaction WHERE user_id = ? AND thread_id IN (${placeholders})`, [userId, ...ids]);
          const map = {};
          vr.forEach(v => { map[v.thread_id] = Number(v.value) || 0; });
          threads.forEach(t => { t.user_vote = map[t.thread_id] || 0; });
        } catch (e) {
          const [vr] = await pool.query(`SELECT thread_id FROM thread_reaction WHERE user_id = ? AND thread_id IN (${placeholders})`, [userId, ...ids]);
          const map = {};
          vr.forEach(v => { map[v.thread_id] = 1; });
          threads.forEach(t => { t.user_vote = map[t.thread_id] || 0; });
        }
      } catch (e) {
        // ignore mapping failures
      }
    }
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
    const userId = req.session && req.session.user && req.session.user.id ? req.session.user.id : null;
    const rows = await fetchThreadById(pool, thread_id, userId);
    if (!rows || !rows.length) return res.status(404).json({ ok: false, message: 'Thread not found' });
    const thread = rows[0];
    const comments = await fetchComments(pool, thread_id, userId);
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
  if (!author_id || !text) return res.status(400).json({ ok: false, message: 'Please log in or sign up first to comment' });
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
    if (!userId) return res.status(401).json({ ok: false, message: 'Please log in or sign up first to vote' });
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

// DELETE /threads/:thread_id - permanently delete a thread and all related data
router.delete('/:thread_id', async (req, res) => {
  try {
    const { thread_id } = req.params;
    const userId = req.session && req.session.user && req.session.user.id;
    if (!userId) return res.status(401).json({ ok: false, message: 'Please log in to delete threads' });

    // ensure the thread exists and get its author
    const [trows] = await pool.query('SELECT thread_id, author_id FROM thread WHERE thread_id = ?', [thread_id]);
    if (!trows || !trows.length) return res.status(404).json({ ok: false, message: 'Thread not found' });
    const thread = trows[0];

    const requesterRole = req.session && req.session.user && req.session.user.role_id ? Number(req.session.user.role_id) : null;
    const isAuthor = Number(thread.author_id) === Number(userId);
    const isAdmin = requesterRole === 1;
    if (!isAuthor && !isAdmin) return res.status(403).json({ ok: false, message: 'Not authorized to delete this thread' });

    // perform deletions in a transaction using a dedicated connection
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // delete comment reactions for comments in this thread
      await conn.query('DELETE cr FROM comment_reaction cr JOIN comment c ON cr.comment_id = c.comment_id WHERE c.thread_id = ?', [thread_id]);

      // delete comments for this thread
      await conn.query('DELETE FROM comment WHERE thread_id = ?', [thread_id]);

      // delete thread reactions/votes
      await conn.query('DELETE FROM thread_reaction WHERE thread_id = ?', [thread_id]);

      // delete media entries for thread
      await conn.query('DELETE FROM thread_media WHERE thread_id = ?', [thread_id]);

      // delete view events for thread
      await conn.query('DELETE FROM view_events WHERE thread_id = ?', [thread_id]);

      // finally delete the thread itself
      await conn.query('DELETE FROM thread WHERE thread_id = ?', [thread_id]);

      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch (er) { }
      throw e;
    } finally {
      conn.release();
    }

    return res.json({ ok: true, thread_id: Number(thread_id) });
  } catch (err) {
    console.error('Delete thread error', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// POST /comments/:comment_id/vote - cast or remove a vote on a comment
router.post('/comments/:comment_id/vote', async (req, res) => {
  try {
    const { comment_id } = req.params;
    const userId = req.session && req.session.user && req.session.user.id;
    if (!userId) return res.status(401).json({ ok: false, message: 'Please log in or sign up first to vote' });
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

// DELETE /comments/:comment_id - soft-delete a comment (replace text with [REMOVED]) and keep replies
router.delete('/comments/:comment_id', async (req, res) => {
  try {
    const { comment_id } = req.params;
    const userId = req.session && req.session.user && req.session.user.id;
    if (!userId) return res.status(401).json({ ok: false, message: 'Please log in to delete comments' });

    // ensure the comment exists and retrieve its thread author so thread authors can moderate comments on their thread
    const [rows] = await pool.query(
      'SELECT c.comment_id, c.author_id, c.thread_id, t.author_id AS thread_author_id FROM comment c LEFT JOIN thread t ON c.thread_id = t.thread_id WHERE c.comment_id = ?',
      [comment_id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Comment not found' });
    const row = rows[0];
    // Allow deletion if the requester is the comment author, the thread author, or an admin (role_id === 1)
    const requesterRole = req.session && req.session.user && req.session.user.role_id ? Number(req.session.user.role_id) : null;
    const isAuthor = Number(row.author_id) === Number(userId);
    const isThreadAuthor = Number(row.thread_author_id) === Number(userId);
    const isAdmin = requesterRole === 1;
    if (!isAuthor && !isAdmin && !isThreadAuthor) return res.status(403).json({ ok: false, message: 'Not authorized to delete this comment' });

    // Soft-delete: replace text with a removal metadata JSON and reset karma to 0
    const { reason } = req.body || {};
    const removedObj = {
      removed: true,
      reason: reason || null,
      removed_by: userId,
      removed_at: new Date().toISOString(),
    };
    const textValue = JSON.stringify(removedObj);
    await pool.query('UPDATE comment SET text = ?, karma = 0 WHERE comment_id = ?', [textValue, comment_id]);

    res.json({ ok: true, comment_id: Number(comment_id) });
  } catch (err) {
    console.error('Delete comment error', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
