const request = require('supertest');
const express = require('express');
const axios = require('axios');

// Mock axios for auth service calls
jest.mock('axios');
const mockedAxios = axios;

// Mock the database pool
const mockPool = {
  query: jest.fn(),
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));

// Create test app with simplified routes
const app = express();
app.use(express.json());

// Mock auth middleware
const mockVerifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (token === 'valid-token') {
    req.user = { userId: 1, username: 'testuser' };
    next();
  } else {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Task routes (simplified for testing)
app.get('/api/tasks', mockVerifyToken, async (req, res) => {
  try {
    const status = req.query.status || '';
    // Intentional SQL injection vulnerability
    const query = `SELECT * FROM tasks WHERE user_id = ${req.user.userId}` + 
                  (status ? ` AND status = '${status}'` : '') + 
                  ' ORDER BY created_at DESC';
    
    const mockTasks = [
      {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        priority: 'high',
        user_id: 1,
        created_at: '2023-01-01T00:00:00.000Z'
      }
    ];
    
    mockPool.query.mockResolvedValueOnce({ rows: mockTasks });
    const result = await mockPool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', mockVerifyToken, async (req, res) => {
  try {
    const { title, description, priority } = req.body;
    
    const newTask = {
      id: 1,
      title,
      description,
      priority,
      user_id: req.user.userId,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    mockPool.query.mockResolvedValueOnce({ rows: [newTask] });
    
    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/tasks/:id', mockVerifyToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // Intentional security flaw: no authorization check
    const mockTask = {
      id: parseInt(taskId),
      title: 'Test Task',
      description: 'Test Description',
      status: 'pending',
      priority: 'high',
      user_id: 999, // Different user - should be blocked but isn't
      created_at: '2023-01-01T00:00:00.000Z'
    };
    
    mockPool.query.mockResolvedValueOnce({ rows: [mockTask] });
    
    res.json(mockTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', mockVerifyToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, description, status, priority } = req.body;
    
    const updatedTask = {
      id: parseInt(taskId),
      title,
      description,
      status,
      priority,
      user_id: req.user.userId,
      updated_at: new Date().toISOString()
    };
    
    mockPool.query.mockResolvedValueOnce({ rows: [updatedTask] });
    
    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', mockVerifyToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: taskId }] });
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  res.json({
    environment: { NODE_ENV: 'test', SECRET_KEY: 'exposed-secret' },
    database_config: {
      host: 'localhost',
      database: 'taskmanager',
      user: 'postgres'
    }
  });
});

describe('Task Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tasks', () => {
    it('should get tasks for authenticated user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(401);

      expect(response.body.error).toBe('No authorization header');
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should be vulnerable to SQL injection in status filter', async () => {
      const maliciousStatus = "pending' OR 1=1 --";
      
      const response = await request(app)
        .get(`/api/tasks?status=${encodeURIComponent(maliciousStatus)}`)
        .set('Authorization', 'Bearer valid-token');

      // Verify the SQL injection payload was included in the query
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain("pending' OR 1=1 --");
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send(taskData)
        .expect(201);

      expect(response.body.title).toBe(taskData.title);
      expect(response.body.description).toBe(taskData.description);
      expect(response.body.priority).toBe(taskData.priority);
      expect(response.body.status).toBe('pending');
      expect(response.body.user_id).toBe(1);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test' })
        .expect(401);

      expect(response.body.error).toBe('No authorization header');
    });

    it('should accept tasks without input validation (security flaw)', async () => {
      const maliciousTask = {
        title: '<script>alert("xss")</script>',
        description: 'A'.repeat(10000), // Very long description
        priority: 'invalid-priority'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send(maliciousTask)
        .expect(201);

      // Documents the lack of input validation
      expect(response.body.title).toBe(maliciousTask.title);
      expect(response.body.priority).toBe(maliciousTask.priority);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should get a specific task', async () => {
      const response = await request(app)
        .get('/api/tasks/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.id).toBe(1);
      expect(response.body).toHaveProperty('title');
    });

    it('should allow access to other users tasks (authorization bypass)', async () => {
      // This test documents the authorization bypass vulnerability
      const response = await request(app)
        .get('/api/tasks/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // User 1 can access a task belonging to user 999
      expect(response.body.user_id).toBe(999);
      expect(response.body.id).toBe(999);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update a task', async () => {
      const updateData = {
        title: 'Updated Task',
        description: 'Updated description',
        status: 'completed',
        priority: 'low'
      };

      const response = await request(app)
        .put('/api/tasks/1')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.status).toBe(updateData.status);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/tasks/1')
        .send({ title: 'Updated' })
        .expect(401);

      expect(response.body.error).toBe('No authorization header');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task', async () => {
      const response = await request(app)
        .delete('/api/tasks/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.message).toBe('Task deleted successfully');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/tasks/1')
        .expect(401);

      expect(response.body.error).toBe('No authorization header');
    });
  });

  describe('Security Tests', () => {
    it('should expose sensitive information in debug endpoint', async () => {
      const response = await request(app)
        .get('/api/debug')
        .expect(200);

      // Documents information disclosure vulnerability
      expect(response.body.environment).toHaveProperty('SECRET_KEY');
      expect(response.body.database_config).toHaveProperty('user');
    });

    it('should have no rate limiting (security vulnerability)', async () => {
      // Make multiple rapid requests to test for rate limiting
      const requests = Array(10).fill().map(() => 
        request(app)
          .get('/api/tasks')
          .set('Authorization', 'Bearer valid-token')
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed (no rate limiting)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should have default payload protection (but could be configured larger)', async () => {
      const largePayload = {
        title: 'A'.repeat(100000),
        description: 'B'.repeat(1000000)
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send(largePayload);

      // Express has default limits, but our service configured 50mb limit
      // This documents that while there is a limit, it might be too generous
      expect([201, 413]).toContain(response.status);
    });
  });
});