/**
 * Test Data Factories
 *
 * Helper functions for creating test data (fixtures).
 * Provides realistic, consistent test data for users, cases, tokens, etc.
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserRole, AccountStatus, User, CreateUserDTO } from '../../src/models/User';
import { generateTokenPair, TokenPair } from '../../src/utils/jwt';

// ============================================================================
// DATABASE ROW TYPES (snake_case from database)
// ============================================================================

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  role: UserRole;
  email_verified: boolean;
  account_status: AccountStatus;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// USER FACTORIES
// ============================================================================

/**
 * Default test user data
 */
export const TEST_USER_DEFAULTS = {
  password: 'TestPassword123!',
  passwordHash: '', // Will be generated
  role: UserRole.VIEWER,
  accountStatus: AccountStatus.ACTIVE,
  emailVerified: true,
};

/**
 * Create a test user in the database
 *
 * @param pool - Database connection pool
 * @param overrides - Optional field overrides
 * @returns Created user (without password hash)
 */
export async function createTestUser(
  pool: Pool,
  overrides: Partial<CreateUserDTO> & { email?: string } = {}
): Promise<User> {
  const email = overrides.email || `test-${uuidv4()}@example.com`;
  const passwordHash = overrides.passwordHash || await bcrypt.hash(TEST_USER_DEFAULTS.password, 4);

  const userData: CreateUserDTO = {
    email,
    passwordHash,
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    displayName: overrides.displayName || 'Test User',
    role: overrides.role || TEST_USER_DEFAULTS.role,
    emailVerified: overrides.emailVerified ?? TEST_USER_DEFAULTS.emailVerified,
  };

  const result = await pool.query<UserRow>(
    `
    INSERT INTO users (
      email, password_hash, first_name, last_name, display_name,
      role, email_verified, account_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      id, email, first_name, last_name, display_name,
      role, email_verified, account_status,
      last_login, created_at, updated_at
    `,
    [
      userData.email,
      userData.passwordHash,
      userData.firstName,
      userData.lastName,
      userData.displayName,
      userData.role,
      userData.emailVerified,
      TEST_USER_DEFAULTS.accountStatus,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    role: row.role,
    emailVerified: row.email_verified,
    accountStatus: row.account_status,
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create a test admin user
 *
 * @param pool - Database connection pool
 * @param overrides - Optional field overrides
 * @returns Created admin user
 */
export async function createTestAdmin(
  pool: Pool,
  overrides: Partial<CreateUserDTO> & { email?: string } = {}
): Promise<User> {
  return createTestUser(pool, {
    ...overrides,
    role: UserRole.ADMIN,
  });
}

/**
 * Create a test viewer user
 *
 * @param pool - Database connection pool
 * @param overrides - Optional field overrides
 * @returns Created viewer user
 */
export async function createTestViewer(
  pool: Pool,
  overrides: Partial<CreateUserDTO> & { email?: string } = {}
): Promise<User> {
  return createTestUser(pool, {
    ...overrides,
    role: UserRole.VIEWER,
  });
}

/**
 * Create a test contributor user
 *
 * @param pool - Database connection pool
 * @param overrides - Optional field overrides
 * @returns Created contributor user
 */
export async function createTestContributor(
  pool: Pool,
  overrides: Partial<CreateUserDTO> & { email?: string } = {}
): Promise<User> {
  return createTestUser(pool, {
    ...overrides,
    role: UserRole.CONTRIBUTOR,
  });
}

// ============================================================================
// TOKEN FACTORIES
// ============================================================================

/**
 * Generate test JWT tokens for a user
 *
 * @param user - User to generate tokens for
 * @returns Token pair (access + refresh)
 */
export function createTestTokens(user: User): TokenPair {
  return generateTokenPair(user.id, user.email, user.role);
}

/**
 * Create test tokens and store refresh token in database
 *
 * @param pool - Database connection pool
 * @param user - User to generate tokens for
 * @returns Token pair with refresh token stored
 */
export async function createTestTokensWithStorage(
  pool: Pool,
  user: User
): Promise<TokenPair> {
  const tokens = createTestTokens(user);

  // Store refresh token in database (hashed)
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + tokens.refreshTokenExpiresIn * 1000);

  await pool.query(
    `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    `,
    [user.id, tokenHash, expiresAt]
  );

  return tokens;
}

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Create authenticated test context (user + valid tokens)
 *
 * Returns everything needed for authenticated API requests
 *
 * @param pool - Database connection pool
 * @param role - User role (default: VIEWER)
 * @returns User, tokens, and auth header
 */
export async function createAuthenticatedContext(
  pool: Pool,
  role: UserRole = UserRole.VIEWER
): Promise<{
  user: User;
  tokens: TokenPair;
  authHeader: { Authorization: string };
  password: string;
}> {
  const user = await createTestUser(pool, { role });
  const tokens = await createTestTokensWithStorage(pool, user);

  return {
    user,
    tokens,
    authHeader: {
      Authorization: `Bearer ${tokens.accessToken}`,
    },
    password: TEST_USER_DEFAULTS.password,
  };
}

/**
 * Create admin authenticated context
 *
 * @param pool - Database connection pool
 * @returns Admin user with tokens
 */
export async function createAdminContext(pool: Pool): Promise<{
  user: User;
  tokens: TokenPair;
  authHeader: { Authorization: string };
  password: string;
}> {
  return createAuthenticatedContext(pool, UserRole.ADMIN);
}

// ============================================================================
// BULK DATA FACTORIES
// ============================================================================

/**
 * Create multiple test users
 *
 * @param pool - Database connection pool
 * @param count - Number of users to create
 * @param role - Role for all users
 * @returns Array of created users
 */
export async function createTestUsers(
  pool: Pool,
  count: number,
  role: UserRole = UserRole.VIEWER
): Promise<User[]> {
  const users: User[] = [];

  for (let i = 0; i < count; i++) {
    const user = await createTestUser(pool, {
      email: `test-user-${i}-${uuidv4()}@example.com`,
      role,
    });
    users.push(user);
  }

  return users;
}

// ============================================================================
// VERIFICATION/RESET TOKEN FACTORIES
// ============================================================================

/**
 * Create user with email verification token
 *
 * @param pool - Database connection pool
 * @returns User with verification token
 */
export async function createUnverifiedUser(
  pool: Pool
): Promise<{ user: User; verificationToken: string }> {
  const user = await createTestUser(pool, { emailVerified: false });

  const verificationToken = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await pool.query(
    `
    UPDATE users
    SET email_verification_token = $1,
        email_verification_expires = $2
    WHERE id = $3
    `,
    [verificationToken, expiresAt, user.id]
  );

  return { user, verificationToken };
}

/**
 * Create user with password reset token
 *
 * @param pool - Database connection pool
 * @returns User with reset token
 */
export async function createUserWithResetToken(
  pool: Pool
): Promise<{ user: User; resetToken: string }> {
  const user = await createTestUser(pool);

  const resetToken = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query(
    `
    UPDATE users
    SET reset_token = $1,
        reset_token_expires = $2
    WHERE id = $3
    `,
    [resetToken, expiresAt, user.id]
  );

  return { user, resetToken };
}
