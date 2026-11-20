const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// Credentials are supplied at runtime; fail loud when absent (IA-5)
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const JWT_SECRET = requireEnv('JWT_SECRET');
const DB_PASSWORD = requireEnv('DB_PASSWORD');

// CORS is restricted to an explicit allow-list of origins (AC-3)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'taskmanager_app',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'taskmanager',
  password: DB_PASSWORD,
  port: 5432,
});

// Initialize database
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('Database init error:', err);
  }
}

// Password complexity policy (IA-5(1))
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 12) {
    return 'Password must be at least 12 characters long';
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain upper-case, lower-case, numeric and special characters';
  }
  return null;
}

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const policyError = validatePassword(password);
    if (policyError) {
      return res.status(400).json({ error: policyError });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );
    
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    // Intentional security flaw: exposing internal errors
    res.status(400).json({ error: error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Intentional security flaw: SQL injection vulnerability
    const query = `SELECT * FROM users WHERE username = '${username}'`;
    console.log('Executing query:', query); // Debug logging
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
    
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify token endpoint
app.post('/api/auth/verify', (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
    initDB();
  });
}

module.exports = app;