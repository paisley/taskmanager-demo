module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'server.js',
    '!node_modules/**',
    '!coverage/**'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000
};