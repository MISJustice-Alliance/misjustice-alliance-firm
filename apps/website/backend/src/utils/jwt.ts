/**
 * JWT Utilities
 *
 * Provides functions for generating and verifying JSON Web Tokens (JWT)
 * for authentication and authorization.
 *
 * Security features:
 * - Dual-token strategy (access + refresh tokens)
 * - Configurable expiration times
 * - Token revocation support via database
 * - Cryptographic signing with HS256
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRole } from '../models/User';

// ============================================================================
// TYPES
// ============================================================================

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

/**
 * JWT standard registered claims
 * See: https://tools.ietf.org/html/rfc7519#section-4.1
 */
export interface JwtStandardClaims {
  exp?: number;      // Expiration time (seconds since epoch)
  nbf?: number;      // Not before time (seconds since epoch)
  iat?: number;      // Issued at time (seconds since epoch)
  iss?: string;      // Issuer
  aud?: string;      // Audience
  sub?: string;      // Subject
  jti?: string;      // JWT ID
}

/**
 * Complete JWT payload including custom claims and standard claims
 */
export type DecodedToken = TokenPayload & JwtStandardClaims;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;  // seconds
  refreshTokenExpiresIn: number; // seconds
}

export interface VerifyResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Validate and retrieve JWT_SECRET from environment
 *
 * CRITICAL: Must be set in ALL environments (no defaults for security)
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
function getValidatedJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  // Validate JWT_SECRET is set
  if (!secret) {
    throw new Error(
      '❌ JWT_SECRET environment variable is required in all environments.\n' +
      'Generate a secure secret with:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Validate JWT_SECRET length (minimum 32 characters)
  if (secret.length < 32) {
    throw new Error(
      `❌ JWT_SECRET must be at least 32 characters (current: ${secret.length}).\n` +
      'Generate a secure secret with:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Skip validation in test environment (tests use deterministic secrets)
  if (process.env.NODE_ENV !== 'test') {
    // Warn if using obvious default/placeholder values
    const INSECURE_DEFAULTS = [
      'your_jwt_secret_here',
      'change_this_in_production',
      'CHANGE_THIS_IN_PRODUCTION_MINIMUM_32_CHARS',
      'GENERATE_YOUR_OWN_SECRET_HERE',
      'secret',
      'password',
      'test',
    ];

    if (INSECURE_DEFAULTS.some((insecure) => secret.toLowerCase().includes(insecure.toLowerCase()))) {
      throw new Error(
        '❌ JWT_SECRET appears to be a default or placeholder value.\n' +
        'Use a cryptographically secure random secret:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
  }

  return secret;
}

/**
 * JWT secret key - validated at module load time
 */
const JWT_SECRET: string = getValidatedJwtSecret();

// Token expiration times (in seconds)
const ACCESS_TOKEN_EXPIRY = parseInt(process.env.ACCESS_TOKEN_EXPIRY || '900'); // 15 minutes
const REFRESH_TOKEN_EXPIRY = parseInt(process.env.REFRESH_TOKEN_EXPIRY || '604800'); // 7 days

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate an access token for API authentication
 *
 * Access tokens are short-lived (15 minutes) and contain user claims.
 * They should be sent in the Authorization header: `Bearer <token>`
 *
 * Security: Each token includes a cryptographically random JWT ID (jti claim)
 * - 16 bytes = 128 bits of entropy
 * - 2^128 possible unique values
 * - Collision probability: negligible even at scale (~2^64 tokens for 50% collision)
 * - Prevents duplicate token hashes in database
 * - Enables individual token tracking and revocation
 *
 * @param userId - User's unique identifier (UUID)
 * @param email - User's email address
 * @param role - User's role for RBAC
 * @returns Signed JWT access token
 */
export function generateAccessToken(
  userId: string,
  email: string,
  role: UserRole
): string {
  const payload: TokenPayload = {
    userId,
    email,
    role,
    type: 'access',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'misjustice-api',
    audience: 'misjustice-client',
    jwtid: crypto.randomBytes(16).toString('hex'), // Cryptographically random JWT ID
  });
}

/**
 * Generate a refresh token for obtaining new access tokens
 *
 * Refresh tokens are long-lived (7 days) and stored in the database.
 * They should be sent in httpOnly cookies to prevent XSS attacks.
 *
 * Security: Each token includes a cryptographically random JWT ID (jti claim)
 * - 16 bytes = 128 bits of entropy
 * - Prevents duplicate token hashes when tokens generated simultaneously
 * - Critical for token rotation (each refresh generates unique new token)
 * - SHA-256 hash of token stored in database (not plaintext)
 *
 * @param userId - User's unique identifier (UUID)
 * @param email - User's email address
 * @param role - User's role for RBAC
 * @returns Signed JWT refresh token
 */
export function generateRefreshToken(
  userId: string,
  email: string,
  role: UserRole
): string {
  const payload: TokenPayload = {
    userId,
    email,
    role,
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'misjustice-api',
    audience: 'misjustice-client',
    jwtid: crypto.randomBytes(16).toString('hex'), // Cryptographically random JWT ID
  });
}

/**
 * Generate both access and refresh tokens
 *
 * This is the primary function for creating a token pair during:
 * - User login
 * - Token refresh
 * - User registration
 *
 * @param userId - User's unique identifier (UUID)
 * @param email - User's email address
 * @param role - User's role for RBAC
 * @returns Object containing both tokens and their expiration times
 */
export function generateTokenPair(
  userId: string,
  email: string,
  role: UserRole
): TokenPair {
  return {
    accessToken: generateAccessToken(userId, email, role),
    refreshToken: generateRefreshToken(userId, email, role),
    accessTokenExpiresIn: ACCESS_TOKEN_EXPIRY,
    refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRY,
  };
}

// ============================================================================
// TOKEN VERIFICATION
// ============================================================================

/**
 * Verify and decode a JWT token
 *
 * Validates:
 * - Token signature
 * - Token expiration
 * - Token issuer and audience
 * - Token type (access or refresh)
 *
 * @param token - JWT token string
 * @param expectedType - Expected token type ('access' or 'refresh')
 * @returns Verification result with payload or error
 */
export function verifyToken(
  token: string,
  expectedType: 'access' | 'refresh' = 'access'
): VerifyResult {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'misjustice-api',
      audience: 'misjustice-client',
    }) as TokenPayload;

    // Verify token type
    if (decoded.type !== expectedType) {
      return {
        valid: false,
        error: `Invalid token type. Expected ${expectedType}, got ${decoded.type}`,
      };
    }

    return {
      valid: true,
      payload: decoded,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        error: 'Token has expired',
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return {
        valid: false,
        error: 'Invalid token',
      };
    }

    return {
      valid: false,
      error: 'Token verification failed',
    };
  }
}

/**
 * Verify an access token
 *
 * Convenience function for verifying access tokens specifically.
 * Used by authentication middleware.
 *
 * @param token - Access token string
 * @returns Verification result
 */
export function verifyAccessToken(token: string): VerifyResult {
  return verifyToken(token, 'access');
}

/**
 * Verify a refresh token
 *
 * Convenience function for verifying refresh tokens specifically.
 * Used by token refresh endpoint.
 *
 * @param token - Refresh token string
 * @returns Verification result
 */
export function verifyRefreshToken(token: string): VerifyResult {
  return verifyToken(token, 'refresh');
}

// ============================================================================
// TOKEN UTILITIES
// ============================================================================

/**
 * Hash a refresh token for database storage
 *
 * We store hashed refresh tokens in the database to prevent:
 * - Database administrator from using tokens
 * - SQL injection attacks from revealing tokens
 * - Database breach from exposing valid tokens
 *
 * @param token - Refresh token string
 * @returns SHA-256 hash of the token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a random secure token
 *
 * Used for:
 * - Email verification tokens
 * - Password reset tokens
 * - API keys
 *
 * @param bytes - Number of random bytes (default: 32)
 * @returns Hex string of random token
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Decode a JWT token without verification
 *
 * WARNING: This does not verify the token signature!
 * Only use for debugging or extracting claims from expired tokens.
 *
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.decode(token) as DecodedToken | null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Get token expiration time in seconds
 *
 * @param token - JWT token string
 * @returns Expiration time in seconds from now, or null if invalid/expired
 */
export function getTokenExpiration(token: string): number | null {
  try {
    const decoded = jwt.decode(token) as DecodedToken | null;
    if (!decoded || !decoded.exp) return null;

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - now;

    return expiresIn > 0 ? expiresIn : null;
  } catch {
    return null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  generateSecureToken,
  decodeToken,
  getTokenExpiration,
};
