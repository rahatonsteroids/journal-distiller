const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function setupAdmin() {
  const email = "rahat.on.steroids@gmail.com";
  const password = "peaceforeveryone2000@";

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    );

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0) {
      await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [hashedPassword, email]
      );
      console.log(`✅ Updated admin user: ${email}`);
    } else {
      await pool.query(
        'INSERT INTO users (email, password) VALUES ($1, $2)',
        [email, hashedPassword]
      );
      console.log(`✅ Created admin user: ${email}`);
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupAdmin();