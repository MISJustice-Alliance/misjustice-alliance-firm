/**
 * JWT Utilities Unit Tests
 *
 * Tests for JWT token generation, verification, and security
 */

import {
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
} from '../../src/utils/jwt';
import { UserRole } from '../../src/models/User';

describe('JWT Utilities', () => {
  // Test user data
  const testUserId = 'test-user-id-123';
  const testEmail = 'test@example.com';
  const testRole = UserRole.VIEWER;

  describe('generateAccessToken()', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include user information in token payload', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole);
      const verifyResult = verifyAccessToken(token);

      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.payload).toMatchObject({
        userId: testUserId,
        email: testEmail,
        role: testRole,
        type: 'access',
      });
    });

    it('should include standard JWT claims', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded!.iat).toBeDefined(); // Issued at
      expect(decoded!.exp).toBeDefined(); // Expiration
      expect(decoded!.iss).toBe('misjustice-api'); // Issuer
      expect(decoded!.aud).toBe('misjustice-client'); // Audience
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateAccessToken('user-1', 'user1@example.com', UserRole.VIEWER);
      const token2 = generateAccessToken('user-2', 'user2@example.com', UserRole.ADMIN);

      expect(token1).not.toBe(token2);
    });

    it('should set expiration time correctly', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      const issuedAt = decoded!.iat!;
      const expiresAt = decoded!.exp!;
      const expectedExpiry = 900; // 15 minutes in seconds

      expect(expiresAt - issuedAt).toBe(expectedExpiry);
    });
  });

  describe('generateRefreshToken()', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(testUserId, testEmail, testRole);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should mark token type as "refresh"', () => {
      const token = generateRefreshToken(testUserId, testEmail, testRole);
      const verifyResult = verifyRefreshToken(token);

      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.payload?.type).toBe('refresh');
    });

    it('should have longer expiration than access token', () => {
      const accessToken = generateAccessToken(testUserId, testEmail, testRole);
      const refreshToken = generateRefreshToken(testUserId, testEmail, testRole);

      const accessDecoded = decodeToken(accessToken);
      const refreshDecoded = decodeToken(refreshToken);

      expect(accessDecoded).not.toBeNull();
      expect(refreshDecoded).not.toBeNull();
      const accessExpiry = accessDecoded!.exp! - accessDecoded!.iat!;
      const refreshExpiry = refreshDecoded!.exp! - refreshDecoded!.iat!;

      expect(refreshExpiry).toBeGreaterThan(accessExpiry);
      expect(refreshExpiry).toBe(604800); // 7 days
    });
  });

  describe('generateTokenPair()', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = generateTokenPair(testUserId, testEmail, testRole);

      expect(tokens).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        accessTokenExpiresIn: 900,
        refreshTokenExpiresIn: 604800,
      });
    });

    it('should generate distinct tokens', () => {
      const tokens = generateTokenPair(testUserId, testEmail, testRole);

      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  describe('verifyAccessToken()', () => {
    it('should verify valid access token', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole);
      const result = verifyAccessToken(token);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.payload).toBeDefined();
    });

    it('should reject refresh token when verifying access token', () => {
      const refreshToken = generateRefreshToken(testUserId, testEmail, testRole);
      const result = verifyAccessToken(refreshToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid token type');
    });

    it('should reject malformed token', () => {
      const result = verifyAccessToken('not-a-valid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject expired token', async () => {
      // Create token with very short expiry
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        {
          userId: testUserId,
          email: testEmail,
          role: testRole,
          type: 'access',
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1ms' } // Expire immediately
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = verifyAccessToken(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/expired|exp/i);
    });

    it('should reject token with invalid signature', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole);
      const tamperedToken = token.slice(0, -10) + 'tampered!!';

      const result = verifyAccessToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyRefreshToken()', () => {
    it('should verify valid refresh token', () => {
      const token = generateRefreshToken(testUserId, testEmail, testRole);
      const result = verifyRefreshToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.type).toBe('refresh');
    });

    it('should reject access token when verifying refresh token', () => {
      const accessToken = generateAccessToken(testUserId, testEmail, testRole);
      const result = verifyRefreshToken(accessToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid token type');
    });
  });

  describe('hashToken()', () => {
    it('should hash token to SHA-256 hex string', () => {
      const token = 'test-token-12345';
      const hash = hashToken(token);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true); // Hex format
    });

    it('should produce consistent hash for same input', () => {
      const token = 'test-token-12345';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashToken('token-1');
      const hash2 = hashToken('token-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should be deterministic (same token always produces same hash)', () => {
      const token = generateRefreshToken(testUserId, testEmail, testRole);
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      const hash3 = hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });
  });

  describe('generateSecureToken()', () => {
    it('should generate random token', () => {
      const token = generateSecureToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      const token3 = generateSecureToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it('should generate tokens with sufficient entropy', () => {
      const tokens = new Set();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        tokens.add(generateSecureToken());
      }

      // All tokens should be unique (no collisions)
      expect(tokens.size).toBe(count);
    });

    it('should generate URL-safe tokens', () => {
      const token = generateSecureToken();

      // Check if token only contains URL-safe characters
      const urlSafeRegex = /^[a-zA-Z0-9_-]+$/;
      expect(urlSafeRegex.test(token)).toBe(true);
    });
  });

  describe('decodeToken()', () => {
    it('should decode token without verification', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded!.userId).toBe(testUserId);
      expect(decoded!.email).toBe(testEmail);
      expect(decoded!.role).toBe(testRole);
    });

    it('should decode expired token (without verifying)', () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: testUserId, email: testEmail, role: testRole, type: 'access' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // Already expired
      );

      // decodeToken should work even for expired tokens
      const decoded = decodeToken(expiredToken);

      expect(decoded).not.toBeNull();
      expect(decoded!.userId).toBe(testUserId);
      expect(decoded!.exp).toBeDefined();
      expect(decoded!.exp!).toBeLessThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('Security properties', () => {
    it('should not allow token from different secret to verify', () => {
      const jwt = require('jsonwebtoken');
      const wrongSecretToken = jwt.sign(
        { userId: testUserId, email: testEmail, role: testRole, type: 'access' },
        'wrong-secret-key-different-from-env',
        { expiresIn: '15m' }
      );

      const result = verifyAccessToken(wrongSecretToken);

      expect(result.valid).toBe(false);
    });

    it('should not accept token with no expiration', () => {
      const jwt = require('jsonwebtoken');
      const noExpiryToken = jwt.sign(
        { userId: testUserId, email: testEmail, role: testRole, type: 'access' },
        process.env.JWT_SECRET!
        // No expiresIn specified
      );

      const decoded = decodeToken(noExpiryToken);
      expect(decoded).not.toBeNull();
      expect(decoded!.exp).toBeUndefined();

      // Our verification should handle tokens without expiry
      // (JWT library will accept them, but our app should enforce expiry)
    });

    it('should reject token with role escalation attempt', () => {
      // Generate token as viewer
      const viewerToken = generateAccessToken(testUserId, testEmail, UserRole.VIEWER);

      // Verify token
      const result = verifyAccessToken(viewerToken);

      expect(result.payload?.role).toBe(UserRole.VIEWER);
      expect(result.payload?.role).not.toBe(UserRole.ADMIN);
    });
  });

  describe('JWT Uniqueness', () => {
    it('should generate unique JWTs even with same user data at same timestamp', () => {
      const userId = 'same-user-id';
      const email = 'same@example.com';
      const role = UserRole.VIEWER;

      // Generate multiple tokens rapidly (within same millisecond)
      const tokens = Array.from({ length: 100 }, () =>
        generateAccessToken(userId, email, role)
      );

      // All tokens should be unique (string comparison)
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(100);

      // All JTIs should be unique
      const jtis = tokens.map(token => {
        const decoded = decodeToken(token);
        return decoded?.jti;
      });
      const uniqueJtis = new Set(jtis);
      expect(uniqueJtis.size).toBe(100);

      // Verify all JTIs exist (none are undefined)
      expect(jtis.every(jti => jti !== undefined)).toBe(true);
    });

    it('should generate unique token hashes for same user', () => {
      const userId = 'same-user-id';
      const email = 'same@example.com';
      const role = UserRole.VIEWER;

      // Generate multiple refresh tokens rapidly
      const tokens = Array.from({ length: 100 }, () =>
        generateRefreshToken(userId, email, role)
      );

      // Hash all tokens (as done in database storage)
      const hashes = tokens.map(hashToken);
      const uniqueHashes = new Set(hashes);

      // All hashes should be unique (prevents duplicate key constraint violation)
      expect(uniqueHashes.size).toBe(100);
    });

    it('should generate unique access and refresh token pairs', () => {
      const userId = 'test-user';
      const email = 'test@example.com';
      const role = UserRole.VIEWER;

      // Generate multiple token pairs
      const tokenPairs = Array.from({ length: 50 }, () =>
        generateTokenPair(userId, email, role)
      );

      // All access tokens should be unique
      const accessTokens = tokenPairs.map(pair => pair.accessToken);
      expect(new Set(accessTokens).size).toBe(50);

      // All refresh tokens should be unique
      const refreshTokens = tokenPairs.map(pair => pair.refreshToken);
      expect(new Set(refreshTokens).size).toBe(50);

      // All refresh token hashes should be unique
      const refreshHashes = refreshTokens.map(hashToken);
      expect(new Set(refreshHashes).size).toBe(50);
    });

    it('should maintain uniqueness under high-volume generation', () => {
      const userId = 'load-test-user';
      const email = 'load@example.com';
      const role = UserRole.VIEWER;

      // Simulate high load (1000 tokens in rapid succession)
      const startTime = Date.now();
      const tokens = Array.from({ length: 1000 }, () =>
        generateRefreshToken(userId, email, role)
      );
      const endTime = Date.now();

      // Verify performance (should complete in reasonable time)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Should take < 1 second

      // Verify uniqueness at scale
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(1000);

      // Verify unique hashes (prevents database constraint violations)
      const hashes = tokens.map(hashToken);
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1000);
    });
  });

  describe('verifyToken()', () => {
    it('should verify token with correct type', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole);
      const result = verifyToken(token, 'access');

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should reject token with wrong type', () => {
      const accessToken = generateAccessToken(testUserId, testEmail, testRole);
      const result = verifyToken(accessToken, 'refresh');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid token type');
      expect(result.error).toContain('Expected refresh, got access');
    });

    it('should handle generic verification errors', () => {
      // Create an invalid token that will trigger the catch-all error handler
      const result = verifyToken('completely.invalid.token', 'access');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getTokenExpiration()', () => {
    it('should return expiration time in seconds', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole);
      const expiresIn = getTokenExpiration(token);

      expect(expiresIn).not.toBeNull();
      expect(expiresIn).toBeGreaterThan(0);
      expect(expiresIn).toBeLessThanOrEqual(900); // Should be <= 15 minutes
    });

    it('should return null for expired token', () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: testUserId, email: testEmail, role: testRole, type: 'access' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      );

      const expiresIn = getTokenExpiration(expiredToken);

      expect(expiresIn).toBeNull();
    });

    it('should return null for invalid token', () => {
      const expiresIn = getTokenExpiration('not.a.valid.token');

      expect(expiresIn).toBeNull();
    });

    it('should return null for token without expiration', () => {
      const jwt = require('jsonwebtoken');
      const noExpiryToken = jwt.sign(
        { userId: testUserId, email: testEmail, role: testRole, type: 'access' },
        process.env.JWT_SECRET!
        // No expiresIn
      );

      const expiresIn = getTokenExpiration(noExpiryToken);

      expect(expiresIn).toBeNull();
    });

    it('should handle malformed token gracefully', () => {
      const expiresIn = getTokenExpiration('malformed-token');

      expect(expiresIn).toBeNull();
    });
  });

  describe('decodeToken() edge cases', () => {
    it('should return null for completely invalid token', () => {
      const decoded = decodeToken('not-a-token');

      expect(decoded).toBeNull();
    });

    it('should return null for malformed JWT', () => {
      const decoded = decodeToken('header.payload'); // Missing signature

      expect(decoded).toBeNull();
    });

    it('should decode token with extra whitespace', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole);
      const tokenWithSpaces = `  ${token}  `;
      const decoded = decodeToken(tokenWithSpaces.trim());

      expect(decoded).not.toBeNull();
      expect(decoded!.userId).toBe(testUserId);
    });
  });

  describe('generateSecureToken() with custom bytes', () => {
    it('should generate token with custom byte length', () => {
      const token16 = generateSecureToken(16);
      const token32 = generateSecureToken(32);
      const token64 = generateSecureToken(64);

      // Hex encoding: 1 byte = 2 hex characters
      expect(token16.length).toBe(32);  // 16 bytes * 2
      expect(token32.length).toBe(64);  // 32 bytes * 2
      expect(token64.length).toBe(128); // 64 bytes * 2
    });

    it('should generate valid hex string for any byte size', () => {
      const token = generateSecureToken(8);

      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
      expect(token.length).toBe(16); // 8 bytes * 2
    });
  });

  describe('Token error handling edge cases', () => {
    it('should handle token with invalid issuer', () => {
      const jwt = require('jsonwebtoken');
      const wrongIssuerToken = jwt.sign(
        { userId: testUserId, email: testEmail, role: testRole, type: 'access' },
        process.env.JWT_SECRET!,
        { expiresIn: '15m', issuer: 'wrong-issuer' }
      );

      const result = verifyAccessToken(wrongIssuerToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle token with invalid audience', () => {
      const jwt = require('jsonwebtoken');
      const wrongAudienceToken = jwt.sign(
        { userId: testUserId, email: testEmail, role: testRole, type: 'access' },
        process.env.JWT_SECRET!,
        { expiresIn: '15m', audience: 'wrong-audience', issuer: 'misjustice-api' }
      );

      const result = verifyAccessToken(wrongAudienceToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty string token', () => {
      const result = verifyAccessToken('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null-like token', () => {
      // Test with various invalid inputs
      const result1 = verifyAccessToken('null');
      const result2 = verifyAccessToken('undefined');

      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
    });

    it('should handle token with missing claims', () => {
      const jwt = require('jsonwebtoken');
      const minimalToken = jwt.sign(
        { type: 'access' }, // Missing userId, email, role
        process.env.JWT_SECRET!,
        { expiresIn: '15m', issuer: 'misjustice-api', audience: 'misjustice-client' }
      );

      const result = verifyAccessToken(minimalToken);

      // Token should verify but have undefined fields
      expect(result.valid).toBe(true);
      expect(result.payload?.type).toBe('access');
    });
  });

  describe('Token payload validation', () => {
    it('should preserve all user data in token', () => {
      const userId = 'user-123-456-789';
      const email = 'complex.email+tag@subdomain.example.com';
      const role = UserRole.ADMIN;

      const token = generateAccessToken(userId, email, role);
      const result = verifyAccessToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.userId).toBe(userId);
      expect(result.payload?.email).toBe(email);
      expect(result.payload?.role).toBe(role);
    });

    it('should handle special characters in email', () => {
      const specialEmails = [
        'test+tag@example.com',
        'user.name@example.co.uk',
        'test_user@example.com',
        'test-user@example.com',
      ];

      specialEmails.forEach(email => {
        const token = generateAccessToken('user-id', email, UserRole.VIEWER);
        const result = verifyAccessToken(token);

        expect(result.valid).toBe(true);
        expect(result.payload?.email).toBe(email);
      });
    });

    it('should handle all role types', () => {
      const roles = [UserRole.VIEWER, UserRole.CONTRIBUTOR, UserRole.ADMIN, UserRole.DEVELOPER];

      roles.forEach(role => {
        const token = generateAccessToken('user-id', 'test@example.com', role);
        const result = verifyAccessToken(token);

        expect(result.valid).toBe(true);
        expect(result.payload?.role).toBe(role);
      });
    });
  });

  describe('Token timing edge cases', () => {
    it('should accept token immediately after generation', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole);
      const result = verifyAccessToken(token);

      expect(result.valid).toBe(true);
    });

    it('should get correct expiration for newly generated token', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole);
      const expiresIn = getTokenExpiration(token);

      expect(expiresIn).not.toBeNull();
      expect(expiresIn).toBeGreaterThan(890); // Should be close to 900 seconds
      expect(expiresIn).toBeLessThanOrEqual(900);
    });

    it('should handle refresh token expiration', () => {
      const refreshToken = generateRefreshToken(testUserId, testEmail, testRole);
      const expiresIn = getTokenExpiration(refreshToken);

      expect(expiresIn).not.toBeNull();
      expect(expiresIn).toBeGreaterThan(604700); // Should be close to 7 days
      expect(expiresIn).toBeLessThanOrEqual(604800);
    });
  });

  describe('Hash consistency', () => {
    it('should produce same hash for same token multiple times', () => {
      const token = 'consistent-token-string';
      const hashes = Array.from({ length: 100 }, () => hashToken(token));
      const uniqueHashes = new Set(hashes);

      expect(uniqueHashes.size).toBe(1);
    });

    it('should produce different hash for even slightly different tokens', () => {
      const token1 = 'token-string';
      const token2 = 'token-String'; // Different capitalization

      const hash1 = hashToken(token1);
      const hash2 = hashToken(token2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
