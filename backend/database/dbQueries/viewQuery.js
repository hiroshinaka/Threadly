const crypto = require('crypto');

/**
 * viewQuery helpers
 * - shouldRecordView: check recent events to dedupe
 * - insertViewEvent: insert raw event
 * - incrementThreadViewCount: bump cached thread.view_count
 */

async function shouldRecordView(pool, { thread_id, viewer_id = null, session_id = null, ip_hash = null, windowMinutes = 60 }) {
  // if any identifier present, try to find a recent event in the window
  const parts = [];
  const params = [thread_id];
  let where = 'thread_id = ? AND viewed_at >= NOW() - INTERVAL ? MINUTE AND (';
  params.push(windowMinutes);

  const conds = [];
  if (viewer_id) {
    conds.push('viewer_id = ?');
    params.push(viewer_id);
  }
  if (session_id) {
    conds.push('session_id = ?');
    params.push(session_id);
  }
  if (ip_hash) {
    conds.push('ip_hash = ?');
    params.push(ip_hash);
  }

  // If no dedupe identifiers provided, always record
  if (conds.length === 0) return true;

  where += conds.join(' OR ') + ') LIMIT 1';

  const sql = `SELECT 1 FROM view_events WHERE ${where}`;
  const [rows] = await pool.query(sql, params);
  return rows.length === 0;
}

async function insertViewEvent(pool, { thread_id, viewer_id = null, session_id = null, ip_hash = null }) {
  const sql = `INSERT INTO view_events (thread_id, viewer_id, session_id, ip_hash) VALUES (?, ?, ?, ?)`;
  const [res] = await pool.query(sql, [thread_id, viewer_id, session_id, ip_hash]);
  return res.insertId;
}

async function incrementThreadViewCount(pool, thread_id, delta = 1) {
  const sql = `UPDATE thread SET view_count = view_count + ? WHERE thread_id = ?`;
  await pool.query(sql, [delta, thread_id]);
  const [rows] = await pool.query(`SELECT view_count FROM thread WHERE thread_id = ?`, [thread_id]);
  return rows[0] ? rows[0].view_count : 0;
}

function hashIp(raw) {
  if (!raw) return null;
  return crypto.createHash('sha256').update(String(raw)).digest('hex').slice(0, 64);
}

module.exports = {
  shouldRecordView,
  insertViewEvent,
  incrementThreadViewCount,
  hashIp,
};
