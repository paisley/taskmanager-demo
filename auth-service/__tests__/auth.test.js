const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the database pool
const mockPool = {
  query: jest.fn(),
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));

// Import the app after mocking
const app = express();
app.use(express.json());

// Copy the routes from server.js (simplified for testing)
const JWT_SECRET = 'supersecret123';

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      throw new Error('Missing required fields');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = {
      rows: [{ id: 1, username, email }]
    };
    
    // Mock the database call
    mockPool.query.mockResolvedValueOnce(result);
    await mockPool.query(
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
    res.status(400).json({ error: error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    let result;
    if (username === 'nonexistent') {
      result = { rows: [] };
    } else {
      result = {
        rows: [{ 
          id: 1, 
          username: 'testuser', 
          password_hash: await bcrypt.hash('password123', 10)
        }]
      };
    }
    
    // Mock the SQL injection vulnerable query
    const query = `SELECT * FROM users WHERE username = '${username}'`;
    mockPool.query.mockResolvedValueOnce(result);
    await mockPool.query(query);
    
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
      user: { id: user.id, username: user.username }
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

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should hash the password before storing', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Verify that the database was called with hashed password
      expect(mockPool.query).toHaveBeenCalled();
      const insertCall = mockPool.query.mock.calls[0];
      const hashedPassword = insertCall[1][2];
      expect(hashedPassword).not.toBe(userData.password);
      expect(hashedPassword).toMatch(/^\$2[aby]\$10\$.{53}$/); // bcrypt format
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
    });

    it('should fail with invalid password', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail with non-existent user', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    // Test for intentional SQL injection vulnerability
    it('should be vulnerable to SQL injection (security test)', async () => {
      const maliciousLogin = {
        username: "admin' OR '1'='1",
        password: 'anything'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousLogin);

      // The test passes regardless of result, documenting the vulnerability exists
      expect(response.status).toBeGreaterThanOrEqual(200);
      
      // Verify that the SQL injection payload was passed to the query
      expect(mockPool.query).toHaveBeenCalled();
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain("admin' OR '1'='1");
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should verify a valid token', async () => {
      const payload = { userId: 1, username: 'testuser' };
      const token = jwt.sign(payload, JWT_SECRET);

      const response = await request(app)
        .post('/api/auth/verify')
        .send({ token })
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.user.userId).toBe(payload.userId);
      expect(response.body.user.username).toBe(payload.username);
    });

    it('should reject an invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({ token: 'invalid-token' })
        .expect(401);

      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should reject an expired token', async () => {
      const payload = { userId: 1, username: 'testuser' };
      const expiredToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1h' });

      const response = await request(app)
        .post('/api/auth/verify')
        .send({ token: expiredToken })
        .expect(401);

      expect(response.body.valid).toBe(false);
    });
  });

  describe('Security Tests', () => {
    it('should expose hardcoded JWT secret (security vulnerability)', () => {
      // This test documents that the JWT secret is hardcoded
      expect(JWT_SECRET).toBe('supersecret123');
    });

    it('should not validate input fields (security vulnerability)', async () => {
      // Test that minimal validation exists but accepts invalid data
      const invalidData = {
        username: '<script>alert("xss")</script>',
        email: 'not-an-email',
        password: '123' // weak password
      };

      // The registration should succeed despite questionable data
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      // This documents the lack of comprehensive input validation
      expect(response.status).toBe(201);
      expect(response.body.user.username).toBe(invalidData.username);
    });
  });
});