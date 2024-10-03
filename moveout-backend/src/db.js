
const mariadb = require('mariadb');
const config = require('../config/mo/config.json');

const pool = mariadb.createPool({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    connectionLimit: 5
});

pool.getConnection()
    .then(conn => {
        console.log("Successfully connected to the database");
        conn.release();
    })
    .catch(err => {
        console.error("Failed to connect to the database:", err);
    });

async function query(sql, params) {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(sql, params);
        return rows;
    } catch (err) {
        console.error("Database query error:", err);
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

module.exports = { query };

