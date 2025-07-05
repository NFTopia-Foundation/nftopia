// src/tests/setup.ts

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.SENDGRID_WEBHOOK_SECRET = 'test-secret';
});

afterAll(() => {
  // Cleanup
  jest.clearAllMocks();
});

// Mock console methods
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};
