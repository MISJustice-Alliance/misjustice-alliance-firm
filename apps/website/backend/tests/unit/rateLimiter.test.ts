/**
 * Rate Limiter Unit Tests
 *
 * Tests for rate limiting middleware functionality including:
 * - Request counting and limits
 * - Time window enforcement
 * - Rate limit headers
 * - Custom key generators
 * - Skip functionality
 * - Preset configurations
 */

import { Request, Response } from 'express';
import {
  rateLimiter,
  authRateLimiter,
  emailRateLimiter,
  apiRateLimiter,
  webhookRateLimiter,
  resetRateLimit,
  destroyRateLimiter,
} from '../../src/middleware/rateLimiter';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('Rate Limiter Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    mockReq = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as never,
    };

    mockRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();

    // Reset rate limits before each test
    resetRateLimit('127.0.0.1');
  });

  afterAll(() => {
    // Cleanup global store
    destroyRateLimiter();
  });

  // ==========================================================================
  // BASIC FUNCTIONALITY
  // ==========================================================================

  describe('Basic Rate Limiting', () => {
    it('should allow requests under the limit', () => {
      const limiter = rateLimiter({ max: 5, windowMs: 60000 });

      // Make 5 requests (all should pass)
      for (let i = 0; i < 5; i++) {
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block requests over the limit', () => {
      const limiter = rateLimiter({ max: 3, windowMs: 60000 });

      // Make 3 requests (should pass)
      for (let i = 0; i < 3; i++) {
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // 4th request should be blocked
      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
        },
      });
    });

    it('should reset counter after time window expires', async () => {
      const limiter = rateLimiter({ max: 2, windowMs: 100 }); // 100ms window

      // Make 2 requests (should pass)
      limiter(mockReq as Request, mockRes as Response, mockNext);
      limiter(mockReq as Request, mockRes as Response, mockNext);

      // 3rd request should be blocked
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Reset mocks
      mockNext.mockClear();
      (mockRes.status as jest.Mock).mockClear();

      // New requests should pass after window reset
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // RATE LIMIT HEADERS
  // ==========================================================================

  describe('Rate Limit Headers', () => {
    it('should set rate limit headers when enabled', () => {
      const limiter = rateLimiter({ max: 10, windowMs: 60000, headers: true });

      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '9');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      );
    });

    it('should not set headers when disabled', () => {
      const limiter = rateLimiter({ max: 10, windowMs: 60000, headers: false });

      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).not.toHaveBeenCalled();
    });

    it('should set Retry-After header when limit exceeded', () => {
      const limiter = rateLimiter({ max: 1, windowMs: 60000 });

      // First request passes
      limiter(mockReq as Request, mockRes as Response, mockNext);

      // Second request blocked
      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Retry-After',
        expect.stringMatching(/^\d+$/)
      );
    });

    it('should update remaining count correctly', () => {
      const limiter = rateLimiter({ max: 5, windowMs: 60000, headers: true });

      // First request: 4 remaining
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');

      // Second request: 3 remaining
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '3');

      // Third request: 2 remaining
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '2');
    });
  });

  // ==========================================================================
  // CUSTOM KEY GENERATORS
  // ==========================================================================

  describe('Custom Key Generators', () => {
    it('should use IP address by default', () => {
      const limiter = rateLimiter({ max: 2, windowMs: 60000 });

      const req1: Partial<Request> = {
        ip: '192.168.1.1',
        socket: { remoteAddress: '192.168.1.1' } as never,
      };

      limiter(req1 as unknown as Request, mockRes as Response, mockNext);
      limiter(req1 as unknown as Request, mockRes as Response, mockNext);

      // Different IP should have separate counter
      mockNext.mockClear();
      const req2: Partial<Request> = {
        ip: '192.168.1.2',
        socket: { remoteAddress: '192.168.1.2' } as never,
      };
      limiter(req2 as unknown as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should use custom key generator', () => {
      const limiter = rateLimiter({
        max: 2,
        windowMs: 60000,
        keyGenerator: (req) => (req as Request & { userId?: string }).userId || 'anonymous',
      });

      // Simulate user ID in request
      (mockReq as Request & { userId?: string }).userId = 'user-123';

      limiter(mockReq as Request, mockRes as Response, mockNext);
      limiter(mockReq as Request, mockRes as Response, mockNext);

      // 3rd request should be blocked
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);

      // Different user should have separate counter
      mockNext.mockClear();
      (mockRes.status as jest.Mock).mockClear();
      (mockReq as Request & { userId?: string }).userId = 'user-456';

      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SKIP FUNCTIONALITY
  // ==========================================================================

  describe('Skip Functionality', () => {
    it('should skip rate limiting when skip function returns true', () => {
      const limiter = rateLimiter({
        max: 1,
        windowMs: 60000,
        skip: (req) => (req as Request & { skipRateLimit?: boolean }).skipRateLimit === true,
      });

      // Mark request to be skipped
      (mockReq as Request & { skipRateLimit?: boolean }).skipRateLimit = true;

      // Make multiple requests (all should pass)
      for (let i = 0; i < 5; i++) {
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting when skip function returns false', () => {
      const limiter = rateLimiter({
        max: 1,
        windowMs: 60000,
        skip: () => false,
      });

      // First request passes
      limiter(mockReq as Request, mockRes as Response, mockNext);

      // Second request blocked
      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });
  });

  // ==========================================================================
  // CUSTOM MESSAGES AND STATUS CODES
  // ==========================================================================

  describe('Custom Configuration', () => {
    it('should use custom error message', () => {
      const customMessage = 'Too many login attempts. Try again later.';
      const limiter = rateLimiter({
        max: 1,
        windowMs: 60000,
        message: customMessage,
      });

      // First request passes
      limiter(mockReq as Request, mockRes as Response, mockNext);

      // Second request uses custom message
      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: customMessage,
        },
      });
    });

    it('should use custom status code', () => {
      const limiter = rateLimiter({
        max: 1,
        windowMs: 60000,
        statusCode: 503,
      });

      // Exceed limit
      limiter(mockReq as Request, mockRes as Response, mockNext);
      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(503);
    });

    it('should use custom handler', () => {
      const customHandler = jest.fn();
      const limiter = rateLimiter({
        max: 1,
        windowMs: 60000,
        handler: customHandler,
      });

      // Exceed limit
      limiter(mockReq as Request, mockRes as Response, mockNext);
      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(customHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });
  });

  // ==========================================================================
  // PRESET CONFIGURATIONS
  // ==========================================================================

  describe('Preset Configurations', () => {
    it('authRateLimiter should have strict limits', () => {
      // Make 5 requests (should pass)
      for (let i = 0; i < 5; i++) {
        authRateLimiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // 6th request should be blocked
      authRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('emailRateLimiter should limit email requests', () => {
      resetRateLimit('127.0.0.1');

      // Make 10 requests (should pass)
      for (let i = 0; i < 10; i++) {
        emailRateLimiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // 11th request should be blocked
      emailRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(10);
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('apiRateLimiter should have moderate limits', () => {
      resetRateLimit('127.0.0.1');

      // Make 100 requests (should pass)
      for (let i = 0; i < 100; i++) {
        apiRateLimiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // 101st request should be blocked
      apiRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(100);
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('webhookRateLimiter should have high limits', () => {
      resetRateLimit('127.0.0.1');

      // Make 1000 requests (should pass)
      for (let i = 0; i < 1000; i++) {
        webhookRateLimiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // 1001st request should be blocked
      webhookRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1000);
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('webhookRateLimiter should not expose rate limit headers', () => {
      (mockRes.setHeader as jest.Mock).mockClear();

      webhookRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      // Headers should not be set
      expect(mockRes.setHeader).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle missing IP address', () => {
      const limiter = rateLimiter({ max: 5, windowMs: 60000 });

      const reqWithoutIp: Partial<Request> = {
        ip: undefined,
        socket: {} as never,
      };

      // Should use 'unknown' as key
      limiter(reqWithoutIp as unknown as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle concurrent requests correctly', () => {
      const limiter = rateLimiter({ max: 5, windowMs: 60000 });

      // Simulate 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // Only first 5 should pass
      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockRes.status).toHaveBeenCalledTimes(5);
    });

    it('should handle zero max limit', () => {
      const limiter = rateLimiter({ max: 0, windowMs: 60000 });

      // First request should be blocked
      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });
  });
});
