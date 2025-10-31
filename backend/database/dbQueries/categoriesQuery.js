const { generateUniqueSlug } = require('../../utils/slug');
const { addSubscription } = require('./subscriptionQuery');

let createCategory = async (pool, name, admin_id, text_allow, photo_allow, description) => {
    // generate slug from name and ensure uniqueness
    const slug = await generateUniqueSlug(pool, 'categories', 'slug', name || `cat-${Date.now()}`);
    const [result] = await pool.query(
        'INSERT INTO categories (name, admin_id, text_allow, photo_allow, description, slug) VALUES (?, ?, ?, ?, ?, ?)',
        [name, admin_id, Number(text_allow) ? 1 : 0, Number(photo_allow) ? 1 : 0, description, slug]
    );
    const insertId = result.insertId;
    const [rows] = await pool.query('SELECT categories_id, name, admin_id, text_allow, photo_allow, description, slug FROM categories WHERE categories_id = ?', [insertId]);
    if (!rows.length) throw new Error('Failed to retrieve created category');
    const created = rows[0];

    // auto-subscribe the creating admin to the new category (best-effort)
    try {
        if (admin_id && created && created.categories_id) {
            await addSubscription(pool, admin_id, created.categories_id);
        }
    } catch (e) {
        // don't fail category creation if subscription insert fails; log and continue
        console.error('Failed to auto-subscribe category admin:', e);
    }

    return created;
}

let searchCategoriesByName = async (pool, name) => {
    const [rows] = await pool.query(
        'SELECT categories_id, name, admin_id, text_allow, photo_allow FROM categories WHERE name LIKE ?',
        [`%${name}%`]
    );
    return rows;
}

module.exports = { createCategory, searchCategoriesByName };