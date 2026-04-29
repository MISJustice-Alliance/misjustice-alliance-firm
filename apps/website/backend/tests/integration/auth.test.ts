/**
 * Authentication API Integration Tests
 *
 * Tests for authentication endpoints with real database
 */

// Set environment variables BEFORE imports
process.env.JWT_SECRET = 'test-secret-key-for-testing-auth-integration-tests-minimum-32-chars';
process.env.MAILGUN_API_KEY = 'test-api-key';
process.env.MAILGUN_DOMAIN = 'test.example.com';

import request from 'supertest';
import express, { Express } from 'express';
import { Pool } from 'pg';
import { createAuthRoutes } from '../../src/routes/authRoutes';
import { destroyRateLimiter, resetRateLimit } from '../../src/middleware/rateLimiter';
import {
  getTestPool,
  closeTestPool,
  truncateAllTables,
  runMigrations,
} from '../helpers/testDatabase';
import {
  createTestUser,
  createAuthenticatedContext,
  TEST_USER_DEFAULTS,
} from '../helpers/testFactories';
import { expectCookieCleared, expectCookieAttributes } from '../helpers/cookieHelpers';
import { UserRole } from '../../src/models/User';

describe('Authentication API Integration Tests', () => {
  let app: Express;
  let pool: Pool;

  // ============================================================================
  // SETUP / TEARDOWN
  // ============================================================================

  beforeAll(async () => {
    // Get test database pool
    pool = getTestPool();

    // Run migrations to create tables
    await runMigrations();

    // Create Express app with auth routes
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRoutes(pool));
  });

  beforeEach(async () => {
    // Reset rate limits before each test
    resetRateLimit('127.0.0.1');
    resetRateLimit('::ffff:127.0.0.1');

    // Clean database before each test
    await truncateAllTables();
  });

  afterAll(async () => {
    // Cleanup rate limiter
    destroyRateLimiter();

    // Close database connection
    await closeTestPool();
  });

  // ============================================================================
  // REGISTRATION TESTS
  // ============================================================================

  describe('POST /api/auth/register', () => {
    const validRegistration = {
      email: 'newuser@example.com',
      password: 'ValidPassword123!',
      firstName: 'New',
      lastName: 'User',
    };

    it('should register new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistration)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: validRegistration.email.toLowerCase(),
            firstName: validRegistration.firstName,
            lastName: validRegistration.lastName,
            role: UserRole.VIEWER, // Default role
            emailVerified: false, // Not verified yet
          },
          accessToken: expect.any(String),
          expiresIn: 900,
        },
        message: expect.stringContaining('successful'),
      });

      // Verify password hash is NOT returned
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should return refresh token in httpOnly cookie', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistration)
        .expect(201);

      // Verify refresh token cookie has correct security attributes
      expectCookieAttributes(
        response.headers['set-cookie'] as unknown as string[],
        'refreshToken',
        {
          httpOnly: true,
          sameSite: 'Strict',
        }
      );
    });

    it('should reject registration with existing email', async () => {
      // Create existing user
      await createTestUser(pool, { email: validRegistration.email });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistration)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: expect.stringContaining('already registered'),
        },
      });
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistration,
          password: 'weak', // Too short, no uppercase, no number
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              msg: expect.stringContaining('8 characters'),
            }),
          ]),
        },
      });
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistration,
          email: 'not-an-email',
        })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Invalid email address',
          }),
        ])
      );
    });

    it('should normalize email to lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistration,
          email: 'NewUser@EXAMPLE.COM',
        })
        .expect(201);

      expect(response.body.data.user.email).toBe('newuser@example.com');
    });
  });

  // ============================================================================
  // LOGIN TESTS
  // ============================================================================

  describe('POST /api/auth/login', () => {
    let testUser: { email: string; password: string };

    beforeEach(async () => {
      // Create test user before each login test
      const user = await createTestUser(pool, {
        email: 'testuser@example.com',
      });

      testUser = {
        email: user.email,
        password: TEST_USER_DEFAULTS.password,
      };
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: testUser.email,
            role: UserRole.VIEWER,
          },
          accessToken: expect.any(String),
          expiresIn: 900,
        },
      });

      // Check refresh token cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Invalid email or password',
        },
      });
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should increment failed login attempts', async () => {
      // Attempt 3 failed logins
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'WrongPassword!',
          })
          .expect(401);
      }

      // Verify failed attempts in database
      const result = await pool.query(
        'SELECT failed_login_attempts FROM users WHERE email = $1',
        [testUser.email]
      );

      expect(result.rows[0].failed_login_attempts).toBe(3);
    });

    it('should lock account after 5 failed attempts', async () => {
      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'WrongPassword!',
          })
          .expect(401);
      }

      // Reset rate limit to allow 6th attempt (rate limit = 5 req/15min)
      // This allows testing account locking independent of rate limiting
      resetRateLimit('127.0.0.1');
      resetRateLimit('::ffff:127.0.0.1');

      // 6th attempt should show account locked
      const response = await request(app)
        .post('/api/auth/login')
        .send(testUser)
        .expect(401);

      expect(response.body.error.message).toContain('locked');
    });

    it('should reset failed attempts after successful login', async () => {
      // Failed attempt
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!',
        })
        .expect(401);

      // Successful login
      await request(app)
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      // Verify failed attempts reset
      const result = await pool.query(
        'SELECT failed_login_attempts FROM users WHERE email = $1',
        [testUser.email]
      );

      expect(result.rows[0].failed_login_attempts).toBe(0);
    });
  });

  // ============================================================================
  // TOKEN REFRESH TESTS
  // ============================================================================

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const { tokens } = await createAuthenticatedContext(pool);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          expiresIn: 900,
        },
      });

      // New access token should be different
      expect(response.body.data.accessToken).not.toBe(tokens.accessToken);

      // New refresh token should be in cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    it('should revoke old refresh token after refresh', async () => {
      const { tokens } = await createAuthenticatedContext(pool);

      // First refresh
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      // Try to use old refresh token again
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);

      expect(response.body.error.message).toContain('revoked');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // LOGOUT TESTS
  // ============================================================================

  describe('POST /api/auth/logout', () => {
    it('should logout and revoke refresh token', async () => {
      const { tokens } = await createAuthenticatedContext(pool);

      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('success'),
      });

      // Verify refresh token is revoked in database
      const result = await pool.query(
        'SELECT revoked FROM refresh_tokens WHERE token_hash = $1',
        [require('crypto').createHash('sha256').update(tokens.refreshToken).digest('hex')]
      );

      expect(result.rows[0].revoked).toBe(true);
    });

    it('should clear refresh token cookie', async () => {
      const { tokens } = await createAuthenticatedContext(pool);

      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      // Verify cookie is cleared (accepts any valid deletion method)
      expectCookieCleared(
        response.headers['set-cookie'] as unknown as string[],
        'refreshToken'
      );
    });
  });

  // ============================================================================
  // PROTECTED ROUTE TESTS (Authentication Middleware)
  // ============================================================================

  describe('GET /api/auth/verify (protected route)', () => {
    it('should verify valid access token', async () => {
      const { tokens, user } = await createAuthenticatedContext(pool);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
        },
      });
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject refresh token in Authorization header', async () => {
      const { tokens } = await createAuthenticatedContext(pool);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${tokens.refreshToken}`)
        .expect(401);

      expect(response.body.error.message).toContain('Invalid token type');
    });
  });
});
