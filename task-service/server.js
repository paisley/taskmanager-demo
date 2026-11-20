const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3002;

// Credentials are supplied at runtime; fail loud when absent (IA-5)
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

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
app.use(express.json({ limit: '50mb' })); // Intentional flaw: no size limit

const pool = new Pool({
  user: process.env.DB_USER || 'taskmanager_app',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'taskmanager',
  password: DB_PASSWORD,
  port: 5432,
});

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// Initialize database
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        priority VARCHAR(10) DEFAULT 'medium',
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tasks table initialized');
  } catch (err) {
    console.error('Database init error:', err);
  }
}

// Middleware to verify JWT token
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Intentional security flaw: no timeout on auth service call
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/verify`, { token });
    
    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    // Intentional security flaw: exposing internal errors
    res.status(401).json({ error: 'Token verification failed', details: error.message });
  }
}

// Get all tasks for user
app.get('/api/tasks', verifyToken, async (req, res) => {
  try {
    // Intentional security flaw: SQL injection vulnerability
    const status = req.query.status || '';
    const query = `SELECT * FROM tasks WHERE user_id = ${req.user.userId}` + 
                  (status ? ` AND status = '${status}'` : '') + 
                  ' ORDER BY created_at DESC';
    
    console.log('Executing query:', query); // Debug logging
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single task
app.get('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [taskId, req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new task
app.post('/api/tasks', verifyToken, async (req, res) => {
  try {
    const { title, description, priority } = req.body;
    
    // Intentional security flaw: no input validation or sanitization
    
    const result = await pool.query(
      'INSERT INTO tasks (title, description, priority, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, priority, req.user.userId]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update task
app.put('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, description, status, priority } = req.body;
    
    const result = await pool.query(
      'UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND user_id = $6 RETURNING *',
      [title, description, status, priority, taskId, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete task
app.delete('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *', [taskId, req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'task' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task service running on port ${PORT}`);
    initDB();
  });
}

module.exports = app;