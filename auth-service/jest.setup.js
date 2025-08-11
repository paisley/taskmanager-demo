// Jest setup file for common test configuration

// Suppress console.log during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Set test timeout
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_HOST = 'localhost';

// Global test helpers
global.createMockUser = () => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  created_at: new Date().toISOString()
});

global.createMockTask = (overrides = {}) => ({
  id: 1,
  title: 'Test Task',
  description: 'Test Description',
  status: 'pending',
  priority: 'medium',
  user_id: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});