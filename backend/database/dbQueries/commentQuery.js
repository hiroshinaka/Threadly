const mysql = require('mysql2/promise');

/**
 * Delete a comment and all its descendant replies and their reactions.
 * Uses a recursive CTE (MySQL 8+) to collect all descendant comment_ids.
 * Runs inside its own transaction.
 * Returns the number of deleted comments.
 */
async function deleteCommentAndReplies(pool, commentId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // collect comment ids (the target + descendants)
    const [rows] = await conn.query(
      `WITH RECURSIVE cte AS (
         SELECT comment_id, parent_id FROM comment WHERE comment_id = ?
         UNION ALL
         SELECT c.comment_id, c.parent_id FROM comment c JOIN cte ON c.parent_id = cte.comment_id
       ) SELECT comment_id FROM cte`,
      [commentId]
    );
    const ids = rows.map(r => r.comment_id);
    if (!ids.length) {
      await conn.rollback();
      return 0;
    }

    const placeholders = ids.map(() => '?').join(',');

    // delete reactions referencing these comments first
    await conn.query(`DELETE FROM comment_reaction WHERE comment_id IN (${placeholders})`, ids);

    // delete the comments themselves
    const [del] = await conn.query(`DELETE FROM comment WHERE comment_id IN (${placeholders})`, ids);

    await conn.commit();
    return del.affectedRows || 0;
  } catch (err) {
    try { await conn.rollback(); } catch (e) { }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { deleteCommentAndReplies };
