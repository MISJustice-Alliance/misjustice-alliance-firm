/**
 * Authentication Middleware
 *
 * Middleware for JWT token verification and user authentication.
 * Protects routes by validating access tokens from Authorization header.
 *
 * Usage:
 * - Add to routes that require authentication
 * - Access authenticated user via req.user
 * - Combine with RBAC middleware for authorization
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UserRole } from '../models/User';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Authenticated user information attached to request
 */
export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Extend Express Request to include user property
 * Note: namespace is required for Express type augmentation
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Authenticate request using JWT token
 *
 * Validates:
 * 1. Authorization header exists
 * 2. Bearer token format
 * 3. Token signature and expiration
 * 4. Token type is 'access'
 *
 * On success: Attaches user to req.user
 * On failure: Returns 401 Unauthorized
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authorization header is required',
          hint: 'Include "Authorization: Bearer <token>" in request headers',
        },
      });
      return;
    }

    // 2. Verify Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_AUTH_FORMAT',
          message: 'Invalid authorization header format',
          hint: 'Use format: "Authorization: Bearer <token>"',
        },
      });
      return;
    }

    const token = parts[1];

    // 3. Verify and decode token
    const verifyResult = verifyAccessToken(token);

    if (!verifyResult.valid || !verifyResult.payload) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: verifyResult.error || 'Token verification failed',
          hint: 'Token may be expired or invalid. Please login again.',
        },
      });
      return;
    }

    // 4. Attach user information to request
    req.user = {
      userId: verifyResult.payload.userId,
      email: verifyResult.payload.email,
      role: verifyResult.payload.role,
    };

    // 5. Continue to next middleware/route handler
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

/**
 * Optional authentication middleware
 *
 * Similar to authenticate() but doesn't fail if no token is provided.
 * Useful for routes that behave differently for authenticated vs anonymous users.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // res parameter required by Express middleware signature but unused in optional auth
  void res;

  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;

    // No token? That's OK for optional auth
    if (!authHeader) {
      next();
      return;
    }

    // 2. Verify Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // Invalid format? Continue without user
      next();
      return;
    }

    const token = parts[1];

    // 3. Verify and decode token
    const verifyResult = verifyAccessToken(token);

    if (verifyResult.valid && verifyResult.payload) {
      // Valid token: attach user
      req.user = {
        userId: verifyResult.payload.userId,
        email: verifyResult.payload.email,
        role: verifyResult.payload.role,
      };
    }

    // 4. Continue regardless of token validity
    next();
  } catch (error) {
    // Errors are non-fatal for optional auth
    console.error('Optional auth middleware error:', error);
    next();
  }
}

/**
 * Extract token from cookie (alternative to Authorization header)
 *
 * Useful for browser-based clients that store refresh tokens in httpOnly cookies.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function authenticateFromCookie(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // 1. Extract token from cookie
    const token = req.cookies?.accessToken;

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token cookie is required',
        },
      });
      return;
    }

    // 2. Verify and decode token
    const verifyResult = verifyAccessToken(token);

    if (!verifyResult.valid || !verifyResult.payload) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: verifyResult.error || 'Token verification failed',
        },
      });
      return;
    }

    // 3. Attach user information to request
    req.user = {
      userId: verifyResult.payload.userId,
      email: verifyResult.payload.email,
      role: verifyResult.payload.role,
    };

    // 4. Continue to next middleware/route handler
    next();
  } catch (error) {
    console.error('Cookie auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

// Parameter unused but required by Express middleware signature
// eslint-disable-next-line @typescript-eslint/no-unused-vars

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if request is authenticated
 *
 * @param req - Express request
 * @returns True if user is authenticated
 */
export function isAuthenticated(req: Request): boolean {
  return !!req.user;
}

/**
 * Get authenticated user from request
 *
 * @param req - Express request
 * @returns User information or null
 */
export function getAuthUser(req: Request): AuthUser | null {
  return req.user || null;
}

/**
 * Get user ID from authenticated request
 *
 * @param req - Express request
 * @returns User ID or null
 */
export function getUserId(req: Request): string | null {
  return req.user?.userId || null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  authenticate,
  optionalAuth,
  authenticateFromCookie,
  isAuthenticated,
  getAuthUser,
  getUserId,
};
