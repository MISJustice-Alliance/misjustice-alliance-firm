/**
 * UserRepository Unit Tests
 *
 * Tests for user data access layer
 */

import { UserRepository, RefreshTokenDTO } from '../../src/repositories/UserRepository';
import { CreateUserDTO, UpdateUserDTO, UserRole, AccountStatus } from '../../src/models/User';
import { Pool, QueryResult } from 'pg';

// Mock pg Pool
const mockQuery = jest.fn() as jest.MockedFunction<(text: string, values?: any[]) => Promise<QueryResult>>;
const mockPool = {
  query: mockQuery,
  connect: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
} as unknown as Pool;

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(() => {
    repository = new UserRepository(mockPool);
    jest.clearAllMocks();
  });

  const mockUserRow = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: '$2b$12$hashedpassword',
    first_name: 'John',
    last_name: 'Doe',
    display_name: 'JohnD',
    role: UserRole.VIEWER,
    email_verified: true,
    email_verification_token: null,
    email_verification_expires: null,
    account_status: 'active' as const,
    reset_token: null,
    reset_token_expires: null,
    last_login: new Date(),
    failed_login_attempts: 0,
    locked_until: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockRefreshTokenRow = {
    id: 'token-123',
    user_id: 'user-123',
    token_hash: 'hashed-token',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    user_agent: 'Mozilla/5.0',
    ip_address: '127.0.0.1',
    revoked: false,
    revoked_at: null,
    revoked_reason: null,
    created_at: new Date(),
  };

  describe('findById', () => {
    it('should return user when found', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUserRow], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findById('user-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-123');
      expect(result!.email).toBe('test@example.com');
      expect(result!.passwordHash).toBe('$2b$12$hashedpassword');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users'),
        ['user-123']
      );
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUserRow], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findByEmail('test@example.com');

      expect(result).not.toBeNull();
      expect(result!.email).toBe('test@example.com');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1'),
        ['test@example.com']
      );
    });

    it('should convert email to lowercase before querying', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUserRow], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      await repository.findByEmail('Test@Example.COM');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['test@example.com']
      );
    });

    it('should return null when email not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByVerificationToken', () => {
    it('should return user when token is valid', async () => {
      const userWithToken = {
        ...mockUserRow,
        email_verification_token: 'valid-token',
        email_verification_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockQuery.mockResolvedValue({ rows: [userWithToken], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findByVerificationToken('valid-token');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-123');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('email_verification_token = $1'),
        ['valid-token']
      );
    });

    it('should return null when token not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findByVerificationToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('findByResetToken', () => {
    it('should return user when reset token is valid', async () => {
      const userWithResetToken = {
        ...mockUserRow,
        reset_token: 'reset-token-123',
        reset_token_expires: new Date(Date.now() + 1 * 60 * 60 * 1000),
      };

      mockQuery.mockResolvedValue({ rows: [userWithResetToken], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findByResetToken('reset-token-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-123');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('reset_token = $1'),
        ['reset-token-123']
      );
    });

    it('should return null when reset token not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findByResetToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createDto: CreateUserDTO = {
        email: 'newuser@example.com',
        passwordHash: '$2b$12$newhashedpassword',
        firstName: 'Jane',
        lastName: 'Smith',
        role: UserRole.VIEWER,
      };

      const newUserRow = {
        ...mockUserRow,
        id: 'user-456',
        email: 'newuser@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
      };

      mockQuery.mockResolvedValue({ rows: [newUserRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });

      const result = await repository.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('user-456');
      expect(result.email).toBe('newuser@example.com');
      expect(result.firstName).toBe('Jane');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.any(Array)
      );
    });

    it('should create user with minimal fields', async () => {
      const createDto: CreateUserDTO = {
        email: 'minimal@example.com',
        passwordHash: '$2b$12$hashedpassword',
      };

      mockQuery.mockResolvedValue({ rows: [mockUserRow], rowCount: 1, command: 'INSERT', oid: 0, fields: [] });

      const result = await repository.create(createDto);

      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const updates: UpdateUserDTO = {
        firstName: 'Updated',
        lastName: 'Name',
        displayName: 'UpdatedUser',
      };

      const updatedRow = {
        ...mockUserRow,
        first_name: 'Updated',
        last_name: 'Name',
        display_name: 'UpdatedUser',
      };

      mockQuery.mockResolvedValue({ rows: [updatedRow], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.update('user-123', updates);

      expect(result).not.toBeNull();
      expect(result!.firstName).toBe('Updated');
      expect(result!.lastName).toBe('Name');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.any(Array)
      );
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.update('nonexistent', { firstName: 'Test' });

      expect(result).toBeNull();
    });

    it('should update role and account status', async () => {
      const updates: UpdateUserDTO = {
        role: UserRole.ADMIN,
        accountStatus: AccountStatus.SUSPENDED,
      };

      mockQuery.mockResolvedValue({ rows: [mockUserRow], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.update('user-123', updates);

      expect(result).not.toBeNull();
    });
  });

  describe('setVerificationToken', () => {
    it('should set verification token with expiry', async () => {
      const token = 'verification-token-123';
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      await repository.setVerificationToken('user-123', token, expiresAt);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('email_verification_token'),
        expect.arrayContaining(['user-123', token, expiresAt])
      );
    });
  });

  describe('markEmailVerified', () => {
    it('should mark email as verified and clear token', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      await repository.markEmailVerified('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('email_verified = TRUE'),
        ['user-123']
      );
    });
  });

  describe('setResetToken', () => {
    it('should set password reset token with expiry', async () => {
      const token = 'reset-token-456';
      const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

      mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      await repository.setResetToken('user-123', token, expiresAt);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('reset_token'),
        expect.arrayContaining(['user-123', token, expiresAt])
      );
    });
  });

  describe('clearResetToken', () => {
    it('should clear reset token and expiry', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      await repository.clearResetToken('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('reset_token = NULL'),
        ['user-123']
      );
    });
  });

  describe('recordLogin', () => {
    it('should update last login time and reset failed attempts', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      await repository.recordLogin('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('last_login = NOW()'),
        ['user-123']
      );
    });
  });

  describe('recordFailedLogin', () => {
    it('should increment failed login attempts', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      await repository.recordFailedLogin('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('failed_login_attempts'),
        ['user-123']
      );
    });
  });

  describe('isAccountLocked', () => {
    it('should return true when account is locked', async () => {
      const lockedUserRow = {
        ...mockUserRow,
        locked_until: new Date(Date.now() + 30 * 60 * 1000),
      };

      mockQuery.mockResolvedValue({ rows: [lockedUserRow], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.isAccountLocked('user-123');

      expect(result).toBe(true);
    });

    it('should return false when lock has expired', async () => {
      const unlockedUserRow = {
        ...mockUserRow,
        locked_until: new Date(Date.now() - 1000),
      };

      mockQuery.mockResolvedValue({ rows: [unlockedUserRow], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.isAccountLocked('user-123');

      expect(result).toBe(false);
    });

    it('should return false when no lock is set', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUserRow], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.isAccountLocked('user-123');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.isAccountLocked('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should soft delete user by setting status to deactivated', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.delete('user-123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("account_status = 'deactivated'"),
        ['user-123']
      );
    });

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] });

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete user from database', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] });

      const result = await repository.hardDelete('user-123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = $1',
        ['user-123']
      );
    });

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'DELETE', oid: 0, fields: [] });

      const result = await repository.hardDelete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('storeRefreshToken', () => {
    it('should store refresh token with metadata', async () => {
      const tokenData: RefreshTokenDTO = {
        userId: 'user-123',
        tokenHash: 'hashed-token-789',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: 'token-789' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await repository.storeRefreshToken(tokenData);

      expect(result).toBe('token-789');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        expect.arrayContaining([
          'user-123',
          'hashed-token-789',
          tokenData.expiresAt,
          'Mozilla/5.0',
          '192.168.1.1',
        ])
      );
    });

    it('should store refresh token without optional metadata', async () => {
      const tokenData: RefreshTokenDTO = {
        userId: 'user-123',
        tokenHash: 'hashed-token-789',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: 'token-789' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await repository.storeRefreshToken(tokenData);

      expect(result).toBe('token-789');
    });
  });

  describe('findRefreshToken', () => {
    it('should return refresh token when found', async () => {
      mockQuery.mockResolvedValue({ rows: [mockRefreshTokenRow], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findRefreshToken('hashed-token');

      expect(result).not.toBeNull();
      expect(result!.token_hash).toBe('hashed-token');
      expect(result!.user_id).toBe('user-123');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM refresh_tokens'),
        ['hashed-token']
      );
    });

    it('should return null when token not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await repository.findRefreshToken('nonexistent-token');

      expect(result).toBeNull();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token with reason', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      await repository.revokeRefreshToken('hashed-token', 'User logged out');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('revoked = TRUE'),
        expect.arrayContaining(['hashed-token', 'User logged out'])
      );
    });

    it('should revoke refresh token without reason', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      await repository.revokeRefreshToken('hashed-token');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('revoked = TRUE'),
        expect.any(Array)
      );
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user with reason', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 3, command: 'UPDATE', oid: 0, fields: [] });

      await repository.revokeAllUserTokens('user-123', 'Password changed');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        expect.arrayContaining(['user-123', 'Password changed'])
      );
    });

    it('should revoke all tokens for a user without reason', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 2, command: 'UPDATE', oid: 0, fields: [] });

      await repository.revokeAllUserTokens('user-123');

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired refresh tokens', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 5, command: 'DELETE', oid: 0, fields: [] });

      const result = await repository.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refresh_tokens')
      );
    });

    it('should return 0 when no expired tokens found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'DELETE', oid: 0, fields: [] });

      const result = await repository.cleanupExpiredTokens();

      expect(result).toBe(0);
    });
  });
});
