let createThread = async (pool, title, body, author_id, category_id) => {
    const [result] = await pool.query(
        'INSERT INTO thread (title, body, author_id, category_id) VALUES (?, ?, ?, ?)',
        [title, body, author_id, category_id]
    );
    const insertId = result.insertId;
    return insertId;
}

module.exports = { createThread };