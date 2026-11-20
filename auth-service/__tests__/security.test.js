const request = require('supertest');
const { spawnSync } = require('child_process');
const path = require('path');

const mockPool = { query: jest.fn() };
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));

const SERVER = path.join(__dirname, '..', 'server.js');

describe('IA-5: credentials supplied at runtime', () => {
  const run = (env) =>
    spawnSync(process.execPath, [SERVER], {
      env: { PATH: process.env.PATH, ...env },
      encoding: 'utf8',
    });

  it('fails when JWT_SECRET is absent', () => {
    const result = run({ DB_PASSWORD: 'x' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('JWT_SECRET');
  });

  it('fails when DB_PASSWORD is absent', () => {
    const result = run({ JWT_SECRET: 'x' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('DB_PASSWORD');
  });
});

describe('auth-service security controls', () => {
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.DB_PASSWORD = 'test-db-password';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    app = require('../server');
  });

  beforeEach(() => mockPool.query.mockReset());

  it.each([
    ['too short', 'Ab1!short'],
    ['no upper-case', 'lowercase1234!'],
    ['no digit', 'NoDigitsHere!!'],
    ['no special character', 'NoSpecial12345'],
  ])('IA-5(1): rejects a password that is %s', async (_, password) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'u', email: 'u@example.com', password });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Password must/);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('IA-5(1): accepts a compliant password', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'u', email: 'u@example.com' }] });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'u', email: 'u@example.com', password: 'Str0ng!Passw0rd' });
    expect(res.status).toBe(201);
  });

  it('AC-3: allows a listed origin and not an unlisted one', async () => {
    const ok = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const bad = await request(app).get('/health').set('Origin', 'http://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});
