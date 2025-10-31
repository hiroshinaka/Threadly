// subscriptionQuery.js
// Helpers for user subscriptions to categories
const addSubscription = async (pool, userId, categoryId) => {
  const [r] = await pool.query('INSERT IGNORE INTO subscription (user_id, category_id) VALUES (?, ?)', [userId, categoryId]);
  return r.affectedRows > 0;
};

const removeSubscription = async (pool, userId, categoryId) => {
  const [r] = await pool.query('DELETE FROM subscription WHERE user_id = ? AND category_id = ?', [userId, categoryId]);
  return r.affectedRows > 0;
};

const listSubscriptionsForUser = async (pool, userId) => {
  const [rows] = await pool.query('SELECT s.subscription_id, s.category_id, c.name, c.slug FROM subscription s JOIN categories c ON c.categories_id = s.category_id WHERE s.user_id = ?', [userId]);
  return rows || [];
};

module.exports = { addSubscription, removeSubscription, listSubscriptionsForUser };
