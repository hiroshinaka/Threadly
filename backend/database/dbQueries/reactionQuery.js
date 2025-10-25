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

// Handles comment reactions (votes) with transactional updates to cached karma
const voteComment = async (pool, userId, commentId, value) => {
  // value: 1 (up), -1 (down), 0 (remove)
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [colRows] = await conn.query("SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'comment_reaction' AND column_name = 'value' LIMIT 1");
    const hasValue = colRows && colRows.length > 0;

    // lock existing reaction row if any (select different columns depending on schema)
    const selectSql = hasValue
      ? 'SELECT comment_reaction_id, value FROM comment_reaction WHERE user_id = ? AND comment_id = ? FOR UPDATE'
      : 'SELECT comment_reaction_id FROM comment_reaction WHERE user_id = ? AND comment_id = ? FOR UPDATE';
    const [existing] = await conn.query(selectSql, [userId, commentId]);

    let delta = 0;
    if (!existing.length) {
      if (value === 0) {
        delta = 0;
      } else {
        if (hasValue) {
          await conn.query('INSERT INTO comment_reaction (user_id, comment_id, value) VALUES (?, ?, ?)', [userId, commentId, value]);
          delta = value;
        } else {
          // schema only records presence; insert without value
          await conn.query('INSERT INTO comment_reaction (user_id, comment_id) VALUES (?, ?)', [userId, commentId]);
          delta = 1;
        }
      }
    } else {
      const row = existing[0];
      const cur = hasValue ? Number(row.value) : 1;
      if (value === 0) {
        await conn.query('DELETE FROM comment_reaction WHERE comment_reaction_id = ?', [row.comment_reaction_id]);
        delta = -cur;
      } else if (!hasValue && cur === 1 && value !== 0) {
        // presence-only and already present: no-op
        delta = 0;
      } else if (hasValue && cur === value) {
        // no-op
        delta = 0;
      } else if (hasValue) {
        await conn.query('UPDATE comment_reaction SET value = ? WHERE comment_reaction_id = ?', [value, row.comment_reaction_id]);
        delta = value - cur;
      } else {
        // presence-only and we want to upvote (value != 0) but row exists: no-op
        delta = 0;
      }
    }

    if (delta !== 0) {
      // update cached karma on comment table if column exists
      await conn.query('UPDATE comment SET karma = COALESCE(karma,0) + ? WHERE comment_id = ?', [delta, commentId]);
    }

    // fetch current karma (try cached column, otherwise compute)
    const [crow] = await conn.query('SELECT karma FROM comment WHERE comment_id = ?', [commentId]);
    let karma = 0;
    if (crow && crow[0] && typeof crow[0].karma !== 'undefined') {
      karma = crow[0].karma;
    } else {
      const [sumrows] = await conn.query('SELECT COALESCE(SUM(value),0) AS karma FROM comment_reaction WHERE comment_id = ?', [commentId]);
      karma = sumrows && sumrows[0] ? sumrows[0].karma : 0;
    }

    await conn.commit();
    return { karma, delta };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = { voteThread, voteComment };
