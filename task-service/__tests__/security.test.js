const request = require('supertest');
const { spawnSync } = require('child_process');
const path = require('path');

const mockPool = { query: jest.fn(), options: {} };
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ data: { valid: true, user: { userId: 7 } } }),
}));

const SERVER = path.join(__dirname, '..', 'server.js');

describe('IA-5: credentials supplied at runtime', () => {
  it('fails when DB_PASSWORD is absent', () => {
    const result = spawnSync(process.execPath, [SERVER], {
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('DB_PASSWORD');
  });
});

describe('task-service access enforcement', () => {
  let app;
  const auth = { Authorization: 'Bearer token' };

  beforeAll(() => {
    process.env.DB_PASSWORD = 'test-db-password';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    app = require('../server');
  });

  beforeEach(() => mockPool.query.mockReset());

  it('IA-1: debug endpoint is not exposed', async () => {
    const res = await request(app).get('/api/debug');
    expect(res.status).toBe(404);
  });

  it.each([
    ['get', 'get', /SELECT \* FROM tasks WHERE id = \$1 AND user_id = \$2/],
    ['put', 'put', /UPDATE tasks .* WHERE id = \$5 AND user_id = \$6/],
    ['delete', 'delete', /DELETE FROM tasks WHERE id = \$1 AND user_id = \$2/],
  ])('AC-3: %s scopes the query to the caller and returns 404 for others tasks', async (_, method, pattern) => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)[method]('/api/tasks/5').set(auth).send({});
    expect(res.status).toBe(404);
    const [sql, params] = mockPool.query.mock.calls[0];
    expect(sql).toMatch(pattern);
    expect(params).toContain(7);
  });

  it('AC-3: allows a listed origin and not an unlisted one', async () => {
    const ok = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const bad = await request(app).get('/health').set('Origin', 'http://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});
