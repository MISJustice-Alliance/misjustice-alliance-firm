/**
 * Jest Test Setup
 *
 * Global setup configuration for all tests.
 * Runs once before all test suites.
 *
 * Responsibilities:
 * - Set test environment variables
 * - Configure test database connection
 * - Set JWT secrets for testing
 * - Configure timeouts and limits
 */

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

// Set NODE_ENV to test (prevents server auto-start)
process.env.NODE_ENV = 'test';

// Test Database Configuration
// Uses separate test database to avoid corrupting development data
process.env.DATABASE_HOST = process.env.TEST_DATABASE_HOST || 'localhost';
process.env.DATABASE_PORT = process.env.TEST_DATABASE_PORT || '5432';
process.env.DATABASE_NAME = process.env.TEST_DATABASE_NAME || 'misjustice_test';
process.env.DATABASE_USER = process.env.TEST_DATABASE_USER || 'postgres';
process.env.DATABASE_PASSWORD = process.env.TEST_DATABASE_PASSWORD || 'postgres';
process.env.DATABASE_SSL = 'false';

// JWT Configuration for Tests
// Use fixed test secret for deterministic token generation in tests
process.env.JWT_SECRET = 'test_jwt_secret_32_characters_minimum_required_for_hs256';
process.env.ACCESS_TOKEN_EXPIRY = '900'; // 15 minutes
process.env.REFRESH_TOKEN_EXPIRY = '604800'; // 7 days

// bcrypt Configuration
// Use minimum rounds in tests for speed (production uses 12)
process.env.BCRYPT_ROUNDS = '4';

// Logging Configuration
// Suppress logs during tests unless DEBUG=true
if (!process.env.DEBUG) {
  process.env.LOG_LEVEL = 'error';
  // Suppress console output during tests
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for debugging test failures
    error: console.error,
  };
}

// Server Configuration
process.env.PORT = '0'; // Random port for test server
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Mailgun Configuration for Tests
process.env.MAILGUN_API_KEY = 'test-mailgun-api-key';
process.env.MAILGUN_DOMAIN = 'test.example.com';
process.env.MAILGUN_WEBHOOK_SIGNING_KEY = 'test-webhook-signing-key';
process.env.MAIL_FROM = 'test@example.com';

// ============================================================================
// GLOBAL TEST UTILITIES
// ============================================================================

import { createTestDatabase } from './helpers/testDatabase';

/**
 * Global beforeAll hook - runs once before all tests
 */
beforeAll(async () => {
  // Skip database setup for unit tests (tests/unit/**)
  // Unit tests use mocked dependencies and don't need a real database
  const isUnitTest = expect.getState().testPath?.includes('/tests/unit/');

  if (!isUnitTest) {
    // Create test database if it doesn't exist (for integration tests)
    await createTestDatabase();
  }

  if (process.env.DEBUG) {
    console.log('Test environment initialized');
    console.log('Test database:', process.env.DATABASE_NAME);
    console.log('Unit test mode:', isUnitTest);
  }
});

/**
 * Global afterAll hook - runs once after all tests
 */
afterAll(() => {
  // Can be used for global cleanup if needed
  if (process.env.DEBUG) {
    console.log('Test environment cleanup complete');
  }
});
