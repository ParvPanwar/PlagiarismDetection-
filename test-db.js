const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function test() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    const connection = await pool.getConnection();
    console.log("DB Connection SUCCESS!");
    connection.release();
    process.exit(0);
  } catch (err) {
    console.log("DB Connection ERROR:", err.message);
    process.exit(1);
  }
}
test();
