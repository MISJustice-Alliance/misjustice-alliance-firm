/**
 * Rate Limiting Middleware
 *
 * Implements request rate limiting to prevent abuse and protect API resources.
 *
 * Features:
 * - Sliding window rate limiting algorithm
 * - Per-IP and per-user tracking
 * - Configurable limits per endpoint
 * - Memory-based store (can be swapped for Redis in production)
 * - Standard HTTP 429 responses
 * - X-RateLimit-* headers for client awareness
 *
 * Usage:
 *   router.post('/login', rateLimiter({ windowMs: 900000, max: 5 }), loginHandler);
 */

import { Request, Response, NextFunction } from 'express';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Rate limiter configuration options
 */
export interface RateLimiterOptions {
  /**
   * Time window in milliseconds (default: 15 minutes)
   */
  windowMs?: number;

  /**
   * Maximum requests per window (default: 100)
   */
  max?: number;

  /**
   * Message to send when rate limit exceeded
   */
  message?: string;

  /**
   * Status code to send when rate limit exceeded (default: 429)
   */
  statusCode?: number;

  /**
   * Whether to include rate limit headers in response
   */
  headers?: boolean;

  /**
   * Key generator function (defaults to IP address)
   */
  keyGenerator?: (req: Request) => string;

  /**
   * Skip function - return true to skip rate limiting for request
   */
  skip?: (req: Request) => boolean;

  /**
   * Handler called when rate limit is exceeded
   */
  handler?: (req: Request, res: Response) => void;
}

/**
 * Request record for rate limiting
 */
interface RequestRecord {
  count: number;
  resetTime: number;
}

// ============================================================================
// IN-MEMORY STORE
// ============================================================================

/**
 * Simple in-memory store for rate limit data
 * In production, replace with Redis for distributed systems
 */
class MemoryStore {
  private store: Map<string, RequestRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Increment request count for a key
   */
  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // Create new window
      const newRecord: RequestRecord = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.store.set(key, newRecord);
      return newRecord;
    }

    // Increment existing window
    record.count++;
    return record;
  }

  /**
   * Get current count for a key
   */
  get(key: string): RequestRecord | undefined {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record) {
      return undefined;
    }

    // Check if window expired
    if (now > record.resetTime) {
      this.store.delete(key);
      return undefined;
    }

    return record;
  }

  /**
   * Reset counter for a key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destroy the store and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global store instance
const globalStore = new MemoryStore();

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Strict rate limit for authentication endpoints (5 requests per 15 minutes)
 */
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  headers: true,
});

/**
 * Moderate rate limit for email endpoints (10 requests per hour)
 */
export const emailRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many email requests. Please try again later.',
  headers: true,
});

/**
 * General API rate limit (100 requests per 15 minutes)
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests. Please try again later.',
  headers: true,
});

/**
 * Webhook rate limit (1000 requests per hour - higher for external services)
 */
export const webhookRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: 'Webhook rate limit exceeded.',
  headers: false, // Don't expose rate limit info to external services
});

// ============================================================================
// RATE LIMITER MIDDLEWARE
// ============================================================================

/**
 * Create a rate limiter middleware with custom options
 *
 * @param options - Rate limiter configuration
 * @returns Express middleware function
 *
 * @example
 * // Limit login attempts: 5 per 15 minutes
 * router.post('/login',
 *   rateLimiter({ windowMs: 900000, max: 5 }),
 *   loginHandler
 * );
 *
 * @example
 * // Limit by user ID instead of IP
 * router.post('/send-email',
 *   rateLimiter({
 *     max: 10,
 *     keyGenerator: (req) => req.user?.userId || req.ip
 *   }),
 *   sendEmailHandler
 * );
 */
export function rateLimiter(options: RateLimiterOptions = {}) {
  // Set defaults
  const windowMs = options.windowMs ?? 15 * 60 * 1000; // 15 minutes
  const max = options.max ?? 100;
  const headers = options.headers ?? true;
  const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;
  const skip = options.skip ?? (() => false);

  // Create handler with custom message/statusCode or use default
  const handler = options.handler ?? ((_req: Request, res: Response) => {
    const message = options.message ?? 'Too many requests, please try again later.';
    const statusCode = options.statusCode ?? 429;

    res.status(statusCode).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
      },
    });
  });

  // Return middleware function
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip rate limiting if skip function returns true
    if (skip(req)) {
      next();
      return;
    }

    // Generate key for this request
    const key = keyGenerator(req);

    // Increment counter
    const { count, resetTime } = globalStore.increment(key, windowMs);

    // Set rate limit headers
    if (headers) {
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
    }

    // Check if limit exceeded
    if (count > max) {
      // Set Retry-After header
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      // Call custom handler or default handler
      handler(req, res);
      return;
    }

    // Allow request to proceed
    next();
  };
}

/**
 * Default key generator: use IP address
 */
function defaultKeyGenerator(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Reset rate limit for a specific key (useful for testing)
 */
export function resetRateLimit(key: string): void {
  globalStore.reset(key);
}

/**
 * Destroy the global store (for cleanup in tests)
 */
export function destroyRateLimiter(): void {
  globalStore.destroy();
}

export default rateLimiter;
