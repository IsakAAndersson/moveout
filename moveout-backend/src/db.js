import mariadb from "mariadb";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, "..", "config", "mo", "config.json");
const configFile = await fs.readFile(configPath, "utf-8");
const config = JSON.parse(configFile);

const pool = mariadb.createPool({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    connectionLimit: 5,
});

pool.getConnection()
    .then((conn) => {
        console.log("Successfully connected to the database");
        conn.release();
    })
    .catch((err) => {
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

export default { query };
