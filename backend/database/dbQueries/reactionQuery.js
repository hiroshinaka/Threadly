// Handles thread reactions (votes) with transactional updates to cached karma
const voteThread = async (pool, userId, threadId, value) => {
  // value: 1 (up), -1 (down), 0 (remove)
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // lock existing reaction row if any
    const [existing] = await conn.query(
      'SELECT thread_reaction_id, value FROM thread_reaction WHERE user_id = ? AND thread_id = ? FOR UPDATE',
      [userId, threadId]
    );

    let delta = 0;
    if (!existing.length) {
      if (value === 0) {
        delta = 0;
      } else {
        await conn.query('INSERT INTO thread_reaction (user_id, thread_id, value) VALUES (?, ?, ?)', [userId, threadId, value]);
        delta = value;
      }
    } else {
      const row = existing[0];
      const cur = Number(row.value);
      if (value === 0) {
        await conn.query('DELETE FROM thread_reaction WHERE thread_reaction_id = ?', [row.thread_reaction_id]);
        delta = -cur;
      } else if (cur === value) {
        // no-op
        delta = 0;
      } else {
        await conn.query('UPDATE thread_reaction SET value = ? WHERE thread_reaction_id = ?', [value, row.thread_reaction_id]);
        delta = value - cur;
      }
    }

    if (delta !== 0) {
      await conn.query('UPDATE thread SET karma = COALESCE(karma,0) + ? WHERE thread_id = ?', [delta, threadId]);
    }

    const [trows] = await conn.query('SELECT karma FROM thread WHERE thread_id = ?', [threadId]);
    await conn.commit();
    return { karma: trows[0] ? trows[0].karma : 0, delta };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = { voteThread };
