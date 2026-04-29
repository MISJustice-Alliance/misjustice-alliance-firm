/**
 * User Repository
 *
 * Data access layer for user-related database operations.
 * Handles all CRUD operations for users and refresh tokens.
 *
 * Architecture:
 * - Repository pattern for data access abstraction
 * - Prepared statements to prevent SQL injection
 * - Type-safe database operations
 * - Centralized query optimization
 */

import { Pool, QueryResult } from 'pg';
import { User, UserWithPassword, UserRole, CreateUserDTO, UpdateUserDTO, AccountStatus } from '../models/User';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Database row structure for users table
 */
interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: UserRole;
  email_verified: boolean;
  email_verification_token: string | null;
  email_verification_expires: Date | null;
  account_status: 'active' | 'suspended' | 'deactivated';
  reset_token: string | null;
  reset_token_expires: Date | null;
  last_login: Date | null;
  failed_login_attempts: number;
  locked_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Database row structure for refresh_tokens table
 */
interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  user_agent: string | null;
  ip_address: string | null;
  revoked: boolean;
  revoked_at: Date | null;
  revoked_reason: string | null;
  created_at: Date;
}

/**
 * Refresh token data transfer object
 */
export interface RefreshTokenDTO {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

// ============================================================================
// USER REPOSITORY CLASS
// ============================================================================

export class UserRepository {
  constructor(private db: Pool) {}

  // ==========================================================================
  // USER QUERIES
  // ==========================================================================

  /**
   * Find user by ID
   *
   * @param id - User UUID
   * @returns UserWithPassword object or null if not found
   */
  async findById(id: string): Promise<UserWithPassword | null> {
    const query = `
      SELECT * FROM users
      WHERE id = $1
    `;

    const result: QueryResult<UserRow> = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUserWithPassword(result.rows[0]);
  }

  /**
   * Find user by email
   *
   * Used for login and email uniqueness validation.
   *
   * @param email - User email address
   * @returns UserWithPassword object or null if not found
   */
  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const query = `
      SELECT * FROM users
      WHERE email = $1
    `;

    const result: QueryResult<UserRow> = await this.db.query(query, [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUserWithPassword(result.rows[0]);
  }

  /**
   * Find user by email verification token
   *
   * @param token - Email verification token
   * @returns User object or null if not found/expired
   */
  async findByVerificationToken(token: string): Promise<User | null> {
    const query = `
      SELECT * FROM users
      WHERE email_verification_token = $1
        AND email_verification_expires > NOW()
    `;

    const result: QueryResult<UserRow> = await this.db.query(query, [token]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Find user by password reset token
   *
   * @param token - Password reset token
   * @returns User object or null if not found/expired
   */
  async findByResetToken(token: string): Promise<User | null> {
    const query = `
      SELECT * FROM users
      WHERE reset_token = $1
        AND reset_token_expires > NOW()
    `;

    const result: QueryResult<UserRow> = await this.db.query(query, [token]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Create a new user
   *
   * @param userData - User creation data
   * @returns Created user object
   */
  async create(userData: CreateUserDTO): Promise<User> {
    const query = `
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        display_name,
        role,
        email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      userData.email.toLowerCase(),
      userData.passwordHash,
      userData.firstName || null,
      userData.lastName || null,
      userData.displayName || null,
      userData.role || UserRole.VIEWER,
      userData.emailVerified || false,
    ];

    const result: QueryResult<UserRow> = await this.db.query(query, values);
    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Update user information
   *
   * @param id - User UUID
   * @param updates - Fields to update
   * @returns Updated user object or null if not found
   */
  async update(id: string, updates: UpdateUserDTO): Promise<User | null> {
    // Build dynamic update query
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (updates.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(updates.email.toLowerCase());
    }

    if (updates.passwordHash !== undefined) {
      fields.push(`password_hash = $${paramCount++}`);
      values.push(updates.passwordHash);
    }

    if (updates.firstName !== undefined) {
      fields.push(`first_name = $${paramCount++}`);
      values.push(updates.firstName);
    }

    if (updates.lastName !== undefined) {
      fields.push(`last_name = $${paramCount++}`);
      values.push(updates.lastName);
    }

    if (updates.displayName !== undefined) {
      fields.push(`display_name = $${paramCount++}`);
      values.push(updates.displayName);
    }

    if (updates.role !== undefined) {
      fields.push(`role = $${paramCount++}`);
      values.push(updates.role);
    }

    if (updates.emailVerified !== undefined) {
      fields.push(`email_verified = $${paramCount++}`);
      values.push(updates.emailVerified);
    }

    if (updates.accountStatus !== undefined) {
      fields.push(`account_status = $${paramCount++}`);
      values.push(updates.accountStatus);
    }

    if (fields.length === 0) {
      // No fields to update
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result: QueryResult<UserRow> = await this.db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Set email verification token
   *
   * @param userId - User UUID
   * @param token - Verification token
   * @param expiresAt - Token expiration time
   */
  async setVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<void> {
    const query = `
      UPDATE users
      SET email_verification_token = $1,
          email_verification_expires = $2
      WHERE id = $3
    `;

    await this.db.query(query, [token, expiresAt, userId]);
  }

  /**
   * Mark email as verified
   *
   * @param userId - User UUID
   */
  async markEmailVerified(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET email_verified = TRUE,
          email_verification_token = NULL,
          email_verification_expires = NULL
      WHERE id = $1
    `;

    await this.db.query(query, [userId]);
  }

  /**
   * Set password reset token
   *
   * @param userId - User UUID
   * @param token - Reset token
   * @param expiresAt - Token expiration time
   */
  async setResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    const query = `
      UPDATE users
      SET reset_token = $1,
          reset_token_expires = $2
      WHERE id = $3
    `;

    await this.db.query(query, [token, expiresAt, userId]);
  }

  /**
   * Clear password reset token
   *
   * @param userId - User UUID
   */
  async clearResetToken(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET reset_token = NULL,
          reset_token_expires = NULL
      WHERE id = $1
    `;

    await this.db.query(query, [userId]);
  }

  /**
   * Record successful login
   *
   * @param userId - User UUID
   */
  async recordLogin(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET last_login = NOW(),
          failed_login_attempts = 0,
          locked_until = NULL
      WHERE id = $1
    `;

    await this.db.query(query, [userId]);
  }

  /**
   * Record failed login attempt
   *
   * Locks account after 5 failed attempts for 15 minutes.
   *
   * @param userId - User UUID
   */
  async recordFailedLogin(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE
            WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
            ELSE locked_until
          END
      WHERE id = $1
    `;

    await this.db.query(query, [userId]);
  }

  /**
   * Check if account is locked
   *
   * @param userId - User UUID
   * @returns True if account is currently locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const query = `
      SELECT locked_until FROM users
      WHERE id = $1
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) {
      return false;
    }

    const lockedUntil = result.rows[0].locked_until;

    if (!lockedUntil) {
      return false;
    }

    return new Date(lockedUntil) > new Date();
  }

  /**
   * Delete a user (soft delete by deactivating)
   *
   * @param id - User UUID
   * @returns True if user was deleted
   */
  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE users
      SET account_status = 'deactivated'
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Hard delete a user (permanent removal)
   *
   * WARNING: This permanently deletes the user and all associated data.
   * Use only for GDPR compliance or test cleanup.
   *
   * @param id - User UUID
   * @returns True if user was deleted
   */
  async hardDelete(id: string): Promise<boolean> {
    const query = `DELETE FROM users WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ==========================================================================
  // REFRESH TOKEN QUERIES
  // ==========================================================================

  /**
   * Store a refresh token
   *
   * @param tokenData - Refresh token data
   * @returns Created refresh token ID
   */
  async storeRefreshToken(tokenData: RefreshTokenDTO): Promise<string> {
    const query = `
      INSERT INTO refresh_tokens (
        user_id,
        token_hash,
        expires_at,
        user_agent,
        ip_address
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const values = [
      tokenData.userId,
      tokenData.tokenHash,
      tokenData.expiresAt,
      tokenData.userAgent || null,
      tokenData.ipAddress || null,
    ];

    const result = await this.db.query(query, values);
    return result.rows[0].id;
  }

  /**
   * Find refresh token by hash
   *
   * @param tokenHash - SHA-256 hash of refresh token
   * @returns Refresh token row or null if not found/expired/revoked
   */
  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | null> {
    const query = `
      SELECT * FROM refresh_tokens
      WHERE token_hash = $1
        AND expires_at > NOW()
        AND revoked = FALSE
    `;

    const result: QueryResult<RefreshTokenRow> = await this.db.query(query, [tokenHash]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Revoke a refresh token
   *
   * @param tokenHash - SHA-256 hash of refresh token
   * @param reason - Reason for revocation
   */
  async revokeRefreshToken(tokenHash: string, reason?: string): Promise<void> {
    const query = `
      UPDATE refresh_tokens
      SET revoked = TRUE,
          revoked_at = NOW(),
          revoked_reason = $2
      WHERE token_hash = $1
    `;

    await this.db.query(query, [tokenHash, reason || 'User logout']);
  }

  /**
   * Revoke all refresh tokens for a user
   *
   * Used for:
   * - User logout from all devices
   * - Security breach response
   * - Password change
   *
   * @param userId - User UUID
   * @param reason - Reason for revocation
   */
  async revokeAllUserTokens(userId: string, reason?: string): Promise<void> {
    const query = `
      UPDATE refresh_tokens
      SET revoked = TRUE,
          revoked_at = NOW(),
          revoked_reason = $2
      WHERE user_id = $1 AND revoked = FALSE
    `;

    await this.db.query(query, [userId, reason || 'Logout all sessions']);
  }

  /**
   * Clean up expired refresh tokens
   *
   * Should be run periodically (e.g., daily cron job)
   *
   * @returns Number of tokens deleted
   */
  async cleanupExpiredTokens(): Promise<number> {
    const query = `
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW()
    `;

    const result = await this.db.query(query);
    return result.rowCount || 0;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Map database row to UserWithPassword model
   *
   * Transforms snake_case database columns to camelCase TypeScript properties.
   * Includes password hash for authentication purposes.
   *
   * @param row - Database row
   * @returns UserWithPassword object
   */
  private mapRowToUserWithPassword(row: UserRow): UserWithPassword {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      displayName: row.display_name,
      role: row.role,
      emailVerified: row.email_verified,
      accountStatus: row.account_status as AccountStatus,
      lastLogin: row.last_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to User model
   *
   * Transforms snake_case database columns to camelCase TypeScript properties.
   * Excludes password hash for non-authentication use cases.
   *
   * @param row - Database row
   * @returns User object
   */
  private mapRowToUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      displayName: row.display_name,
      role: row.role,
      emailVerified: row.email_verified,
      accountStatus: row.account_status as AccountStatus,
      lastLogin: row.last_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default UserRepository;
