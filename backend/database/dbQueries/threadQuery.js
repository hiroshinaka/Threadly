const { generateUniqueSlug } = require('../../utils/slug');

let createThread = async (pool, title, body, author_id, category_id, body_text = null) => {
    // create a unique slug from title
    const slug = await generateUniqueSlug(pool, 'thread', 'slug', title || `thread-${Date.now()}`);
    const [result] = await pool.query(
        'INSERT INTO thread (title, body, is_active, author_id, category_id, slug, body_text) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, body, 1, author_id, category_id, slug, body_text]
    );
    const insertId = result.insertId;
    return { thread_id: insertId, slug };
}

module.exports = { createThread };