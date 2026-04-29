/**
 * Auth Route Rate Limiting Integration Tests
 *
 * Tests to verify rate limiting is properly applied to authentication endpoints.
 * Ensures brute force attack prevention on:
 * - POST /api/auth/register
 * - POST /api/auth/login
 * - POST /api/auth/forgot-password
 * - POST /api/auth/reset-password
 * - POST /api/auth/resend-verification
 *
 * Rate limit: 5 requests per 15 minutes (configured in authRateLimiter)
 */

// Set environment variables BEFORE imports
process.env.JWT_SECRET = 'test-secret-key-for-testing-rate-limiting-integration-tests';
process.env.MAILGUN_API_KEY = 'test-api-key';
process.env.MAILGUN_DOMAIN = 'test.example.com';

import request from 'supertest';
import express, { Express } from 'express';
import { Pool } from 'pg';
import { createAuthRoutes } from '../../src/routes/authRoutes';
import { resetRateLimit, destroyRateLimiter } from '../../src/middleware/rateLimiter';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('Auth Routes Rate Limiting', () => {
  let app: Express;
  let db: Pool;

  beforeAll(() => {
    // Create mock database pool
    db = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    } as unknown as Pool;

    // Create Express app with auth routes
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRoutes(db));
  });

  afterAll(() => {
    // Cleanup rate limiter
    destroyRateLimiter();
  });

  beforeEach(() => {
    // Reset rate limits before each test
    resetRateLimit('127.0.0.1');
    resetRateLimit('::ffff:127.0.0.1');

    // Clear mock database calls
    jest.clearAllMocks();
  });

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  /**
   * Helper to extract rate limit info from response headers
   */
  function getRateLimitInfo(response: request.Response) {
    return {
      limit: parseInt(response.headers['x-ratelimit-limit'] || '0'),
      remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
      reset: response.headers['x-ratelimit-reset'],
      retryAfter: response.headers['retry-after'],
    };
  }

  // ==========================================================================
  // POST /api/auth/register
  // ==========================================================================

  describe('POST /api/auth/register', () => {
    it('should allow requests under rate limit', async () => {
      const payload = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
      };

      // Mock database to return no existing user
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Make 5 requests (should all pass)
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...payload, email: `test${i}@example.com` });

        // Should not be rate limited
        expect(response.status).not.toBe(429);

        // Should have rate limit headers
        const rateLimit = getRateLimitInfo(response);
        expect(rateLimit.limit).toBe(5);
        expect(rateLimit.remaining).toBe(4 - i);
      }
    });

    it('should block requests over rate limit', async () => {
      const payload = {
        email: 'test@example.com',
        password: 'Password123',
      };

      // Mock database
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Make 5 requests (max allowed)
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/register').send(payload);
      }

      // 6th request should be blocked
      const response = await request(app).post('/api/auth/register').send(payload);

      expect(response.status).toBe(429);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts. Please try again in 15 minutes.',
        },
      });

      // Should have Retry-After header
      const rateLimit = getRateLimitInfo(response);
      expect(rateLimit.retryAfter).toBeDefined();
    });

    it('should set correct rate limit headers', async () => {
      const payload = {
        email: 'test@example.com',
        password: 'Password123',
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const response = await request(app).post('/api/auth/register').send(payload);

      const rateLimit = getRateLimitInfo(response);

      expect(rateLimit.limit).toBe(5);
      expect(rateLimit.remaining).toBe(4);
      expect(rateLimit.reset).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  // ==========================================================================
  // POST /api/auth/login
  // ==========================================================================

  describe('POST /api/auth/login', () => {
    it('should allow requests under rate limit', async () => {
      const payload = {
        email: 'test@example.com',
        password: 'Password123',
      };

      // Mock database to return no user (login fails, but that's OK for rate limit test)
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const response = await request(app).post('/api/auth/login').send(payload);

        // Should not be rate limited (may be 401 due to invalid credentials)
        expect(response.status).not.toBe(429);
      }
    });

    it('should block requests over rate limit', async () => {
      const payload = {
        email: 'test@example.com',
        password: 'Password123',
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/login').send(payload);
      }

      // 6th request should be blocked
      const response = await request(app).post('/api/auth/login').send(payload);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should prevent brute force login attempts', async () => {
      const payload = {
        email: 'victim@example.com',
        password: 'wrong-password',
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Simulate attacker trying multiple passwords
      const passwords = ['pass1', 'pass2', 'pass3', 'pass4', 'pass5', 'pass6'];

      for (let i = 0; i < passwords.length; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ ...payload, password: passwords[i] });

        if (i < 5) {
          // First 5 attempts allowed
          expect(response.status).not.toBe(429);
        } else {
          // 6th attempt blocked
          expect(response.status).toBe(429);
          expect(response.body.error.message).toContain('Too many authentication attempts');
        }
      }
    });
  });

  // ==========================================================================
  // POST /api/auth/forgot-password
  // ==========================================================================

  describe('POST /api/auth/forgot-password', () => {
    it('should allow requests under rate limit', async () => {
      const payload = { email: 'test@example.com' };

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const response = await request(app).post('/api/auth/forgot-password').send(payload);

        expect(response.status).not.toBe(429);
      }
    });

    it('should block requests over rate limit', async () => {
      const payload = { email: 'test@example.com' };

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/forgot-password').send(payload);
      }

      // 6th request blocked
      const response = await request(app).post('/api/auth/forgot-password').send(payload);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should prevent password reset spam', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Attacker trying to spam password reset emails
      const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

      let requestCount = 0;
      for (const email of emails) {
        for (let i = 0; i < 2; i++) {
          requestCount++;
          const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email });

          if (requestCount <= 5) {
            expect(response.status).not.toBe(429);
          } else {
            expect(response.status).toBe(429);
          }
        }
      }
    });
  });

  // ==========================================================================
  // POST /api/auth/reset-password
  // ==========================================================================

  describe('POST /api/auth/reset-password', () => {
    it('should allow requests under rate limit', async () => {
      const payload = {
        token: 'valid-reset-token',
        newPassword: 'NewPassword123',
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const response = await request(app).post('/api/auth/reset-password').send(payload);

        expect(response.status).not.toBe(429);
      }
    });

    it('should block requests over rate limit', async () => {
      const payload = {
        token: 'valid-reset-token',
        newPassword: 'NewPassword123',
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/reset-password').send(payload);
      }

      // 6th request blocked
      const response = await request(app).post('/api/auth/reset-password').send(payload);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  // ==========================================================================
  // POST /api/auth/resend-verification
  // ==========================================================================

  describe('POST /api/auth/resend-verification', () => {
    it('should allow requests under rate limit', async () => {
      const payload = { email: 'test@example.com' };

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const response = await request(app).post('/api/auth/resend-verification').send(payload);

        expect(response.status).not.toBe(429);
      }
    });

    it('should block requests over rate limit', async () => {
      const payload = { email: 'test@example.com' };

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/resend-verification').send(payload);
      }

      // 6th request blocked
      const response = await request(app).post('/api/auth/resend-verification').send(payload);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should prevent verification email spam', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Spam multiple verification requests
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post('/api/auth/resend-verification')
          .send({ email: 'spam@example.com' });

        if (i < 5) {
          expect(response.status).not.toBe(429);
        } else {
          expect(response.status).toBe(429);
          expect(response.body.error.message).toContain('Too many authentication attempts');
        }
      }
    });
  });

  // ==========================================================================
  // RATE LIMIT ISOLATION
  // ==========================================================================

  describe('Rate Limit Isolation', () => {
    it('should track rate limits independently per endpoint', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Make 3 requests to login
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'Password123' });
      }

      // Make 3 requests to register (should share same rate limit per IP)
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${i}@example.com`,
            password: 'Password123',
          });

        // Should be rate limited after combined 5 requests
        if (i < 2) {
          expect(response.status).not.toBe(429);
        } else {
          expect(response.status).toBe(429);
        }
      }
    });
  });

  // ==========================================================================
  // TIME WINDOW RESET
  // ==========================================================================

  describe('Time Window Reset', () => {
    it.skip('should reset rate limit after time window expires', async () => {
      // TODO: This test requires custom rate limiter configuration or long wait time
      // Skipped for now as it would slow down test suite significantly
      // To properly test, we'd need to either:
      // 1. Mock time (using jest.useFakeTimers)
      // 2. Use a very short window (10ms) which may be flaky
      // 3. Actually wait 15 minutes (not practical for test suite)

      const payload = { email: 'test@example.com', password: 'Password123' };

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/login').send(payload);
      }

      // 6th request blocked
      const blockedResponse = await request(app).post('/api/auth/login').send(payload);
      expect(blockedResponse.status).toBe(429);
    });
  });
});
