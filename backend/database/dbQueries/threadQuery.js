const { generateUniqueSlug } = require('../../utils/slug');

let createThread = async (pool, title, author_id, category_id, body_text = null) => {
    // create a unique slug from title
    const slug = await generateUniqueSlug(pool, 'thread', 'slug', title || `thread-${Date.now()}`);
    const [result] = await pool.query(
        'INSERT INTO thread (title, is_active, author_id, category_id, slug, body_text) VALUES (?, ?, ?, ?, ?, ?)',
        [title, 1, author_id, category_id, slug, body_text]
    );
    const insertId = result.insertId;
    return { thread_id: insertId, slug };
}

let insertThreadMedia = async (pool, thread_id, media) => {
    // media: { media_type, url, public_id }
    const [r] = await pool.query(
        `INSERT INTO thread_media (thread_id, media_type, url,  public_id)
         VALUES (?, ?, ?, ?, ?)`,
        [thread_id, media.media_type || 'image', media.url, null, media.public_id || null]
    );
    return r.insertId;
}
let threadViewCount = async (pool, thread_id, viewer_id) => {
    await pool.query(
        'INSERT INTO view_events (view_id, thread_id, viewed_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE viewed_at = NOW()',
        [viewer_id, thread_id]
    );
}

let threadCommentCount = async(pool, thread_id) => {
    const [rows] = await pool.query(
        'SELECT COUNT(*) AS comment_count FROM comment WHERE thread_id = ?',
        [thread_id]
    );
    return rows[0] ? rows[0].comment_count : 0;
}

let fetchThreadFrontPage = async (pool, limit = 50) => {
    const [rows] = await pool.query(
        `SELECT t.thread_id, t.slug AS thread_slug, t.title, t.body_text, t.karma, t.is_active, t.created_at, t.category_id,
                c.name AS category_name, c.slug AS category_slug, comments.comment_count,
                t.author_id, u.username AS author
         FROM thread t
         LEFT JOIN user u ON t.author_id = u.id
         LEFT JOIN categories c ON t.category_id = c.categories_id
         LEFT JOIN (select thread_id,count(*) as comment_count from comment group by thread_id) as comments ON t.thread_id = comments.thread_id
         WHERE t.is_active = 1
         ORDER BY t.created_at DESC
         LIMIT ?;`,
        [limit]
    );

    // attach media for the returned threads (avoid JSON aggregation for compatibility)
    if (rows && rows.length) {
        const ids = rows.map(r => r.thread_id);
        const placeholders = ids.map(() => '?').join(',');
        const [mrows] = await pool.query(`SELECT media_id, thread_id, media_type, url, public_id FROM thread_media WHERE thread_id IN (${placeholders}) ORDER BY media_id ASC`, ids);
        const map = {};
        mrows.forEach(m => { map[m.thread_id] = map[m.thread_id] || []; map[m.thread_id].push(m); });
        rows.forEach(r => { r.media = map[r.thread_id] || []; });
    }
    return rows;
}

let fetchThreadById = async (pool, thread_id, userId = null) => {
    const [rows] = await pool.query(
        `SELECT t.thread_id, t.slug AS thread_slug, t.title, t.body_text, t.karma, t.is_active, t.created_at, t.category_id, t.author_id, u.username as author
         FROM thread t
         JOIN user u ON t.author_id = u.id
         WHERE t.thread_id = ?`,
        [thread_id]
    );
    if (!rows || !rows.length) return rows;

    // attach media for this thread
    const [mrows] = await pool.query('SELECT media_id, thread_id, media_type, url, public_id FROM thread_media WHERE thread_id = ? ORDER BY media_id ASC', [thread_id]);
    rows[0].media = mrows || [];

    // if userId provided, fetch this user's vote on the thread (if any)
    if (userId) {
        try {
            const [vr] = await pool.query('SELECT value FROM thread_reaction WHERE user_id = ? AND thread_id = ? LIMIT 1', [userId, thread_id]);
            const val = (vr && vr[0] && typeof vr[0].value !== 'undefined') ? Number(vr[0].value) : 0;
            rows[0].user_vote = val || 0;
        } catch (e) {
            // ignore failures (e.g., missing column) and default to 0
            rows[0].user_vote = 0;
        }
    }

    return rows;
}

let fetchComments = async (pool, thread_id, userId = null) => {
    // Determine whether comment_reaction has a numeric `value` column.
    const [colCheck] = await pool.query(
        "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'comment_reaction' AND column_name = 'value' LIMIT 1"
    );
    const hasValue = colCheck && colCheck.length > 0;

    const karmaSubquery = hasValue
        ? '(SELECT comment_id, SUM(value) AS karma FROM comment_reaction GROUP BY comment_id)'
        : '(SELECT comment_id, COUNT(*) AS karma FROM comment_reaction GROUP BY comment_id)';

    const [rows] = await pool.query(
        `SELECT c.comment_id, c.text, c.created_at, c.parent_id, c.author_id, u.username,
                COALESCE(cr.karma, 0) AS karma
         FROM comment c
         JOIN user u ON c.author_id = u.id
         LEFT JOIN ${karmaSubquery} cr ON cr.comment_id = c.comment_id
         WHERE c.thread_id = ?
         ORDER BY c.created_at ASC`,
        [thread_id]
    );

    const byId = {};
    rows.forEach(r => byId[r.comment_id] = { ...r, replies: [] });
    const root = [];

    // If userId provided, fetch this user's reactions for these comments
    if (userId && rows.length) {
        const ids = rows.map(r => r.comment_id);
        const placeholders = ids.map(() => '?').join(',');
        try {
            if (hasValue) {
                const [vr] = await pool.query(`SELECT comment_id, value FROM comment_reaction WHERE user_id = ? AND comment_id IN (${placeholders})`, [userId, ...ids]);
                const map = {};
                vr.forEach(v => { map[v.comment_id] = Number(v.value) || 0; });
                rows.forEach(r => { r.user_vote = map[r.comment_id] || 0; });
            } else {
                const [vr] = await pool.query(`SELECT comment_id FROM comment_reaction WHERE user_id = ? AND comment_id IN (${placeholders})`, [userId, ...ids]);
                const map = {};
                vr.forEach(v => { map[v.comment_id] = 1; });
                rows.forEach(r => { r.user_vote = map[r.comment_id] || 0; });
            }
        } catch (e) {
            // ignore and continue without per-comment votes
            rows.forEach(r => { r.user_vote = 0; });
        }
    }

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

module.exports = { createThread, insertThreadMedia, threadViewCount, threadCommentCount, fetchThreadFrontPage, fetchThreadById, fetchComments };