const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a MySQL connection pool using env vars. Assumes MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
const pool = mysql.createPool({
	host: process.env.MYSQL_HOST || 'localhost',
	user: process.env.MYSQL_USER || 'root',
	password: process.env.MYSQL_PASSWORD || '',
	database: process.env.MYSQL_DATABASE || 'threadly',
	port: process.env.MYSQL_PORT || 3306,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

module.exports = pool;
