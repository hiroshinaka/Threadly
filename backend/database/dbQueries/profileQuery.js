let fetchUserPosts = async (pool, userId, limit = 200) => {
	const [rows] = await pool.query(
		`SELECT t.thread_id, t.slug AS thread_slug, t.title, t.body_text, t.karma, t.is_active, t.created_at, t.category_id, t.view_count,
			c.name AS category_name, c.slug AS category_slug,
			COALESCE(comments.comment_count, 0) AS comment_count
	 	 FROM thread t
	 	 LEFT JOIN categories c ON t.category_id = c.categories_id
		 LEFT JOIN (
			 SELECT thread_id, COUNT(*) AS comment_count FROM comment GROUP BY thread_id
		 ) AS comments ON comments.thread_id = t.thread_id
	 	 WHERE t.author_id = ?
	 	 ORDER BY t.created_at DESC
	 	 LIMIT ?`,
		[userId, limit]
	);
	return rows || [];
}

let fetchUserComments = async (pool, userId, limit = 200) => {
	const [rows] = await pool.query(
		`SELECT c.comment_id, c.text, c.created_at, c.parent_id, c.thread_id, t.title AS thread_title,
		       cat.name AS category_name, cat.slug AS category_slug
		 FROM comment c
		 LEFT JOIN thread t ON c.thread_id = t.thread_id
		 LEFT JOIN categories cat ON t.category_id = cat.categories_id
		 WHERE c.author_id = ?
		 ORDER BY c.created_at DESC
		 LIMIT ?`,
		[userId, limit]
	);
	return rows || [];
}

let fetchUserContribCounts = async (pool, userId) => {
	const [rows] = await pool.query(
		`SELECT
			(SELECT COUNT(*) FROM thread WHERE author_id = ?) AS post_count,
			(SELECT COUNT(*) FROM comment WHERE author_id = ?) AS comment_count`,
		[userId, userId]
	);
	return rows && rows[0] ? rows[0] : { post_count: 0, comment_count: 0 };
}

module.exports = { fetchUserPosts, fetchUserComments, fetchUserContribCounts };

