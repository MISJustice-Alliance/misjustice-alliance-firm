/**
 * Authentication Service
 *
 * Business logic for user authentication and authorization.
 * Handles registration, login, token refresh, and logout.
 *
 * Security features:
 * - bcrypt password hashing (12 rounds)
 * - JWT token generation and validation
 * - Refresh token rotation
 * - Account locking after failed attempts
 * - Email verification workflow
 * - Password reset workflow
 */

import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import {
  User,
  UserWithPassword,
  RegisterUserDTO,
  LoginUserDTO,
  CreateUserDTO,
  UserRole,
  AccountStatus,
  sanitizeUser,
} from '../models/User';
import { UserRepository, RefreshTokenDTO } from '../repositories/UserRepository';
import {
  generateTokenPair,
  verifyRefreshToken,
  hashToken,
  generateSecureToken,
  TokenPair,
} from '../utils/jwt';
import { EmailService } from './EmailService';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthResult {
  success: boolean;
  user?: User;
  tokens?: TokenPair;
  error?: string;
}

export interface RefreshResult {
  success: boolean;
  tokens?: TokenPair;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
const PASSWORD_RESET_EXPIRY_HOURS = 1;

// ============================================================================
// AUTH SERVICE CLASS
// ============================================================================

export class AuthService {
  private userRepository: UserRepository;
  private emailService: EmailService;

  constructor(db: Pool, emailService?: EmailService) {
    this.userRepository = new UserRepository(db);
    this.emailService = emailService || new EmailService();
  }

  // ==========================================================================
  // REGISTRATION
  // ==========================================================================

  /**
   * Register a new user
   *
   * Process:
   * 1. Validate email doesn't exist
   * 2. Hash password with bcrypt
   * 3. Create user in database
   * 4. Generate email verification token
   * 5. Return user and auth tokens
   *
   * @param data - Registration data
   * @param clientInfo - Client information for refresh token
   * @returns Auth result with user and tokens
   */
  async register(
    data: RegisterUserDTO,
    clientInfo?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthResult> {
    try {
      // 1. Check if email already exists
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        return {
          success: false,
          error: 'Email already registered',
        };
      }

      // 2. Hash password
      const passwordHash = await this.hashPassword(data.password);

      // 3. Create user
      const createData: CreateUserDTO = {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: data.displayName || data.email.split('@')[0],
        role: UserRole.VIEWER, // Default role
        emailVerified: false,
      };

      const user = await this.userRepository.create(createData);

      // 4. Generate email verification token (implement email sending separately)
      const verificationToken = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFICATION_EXPIRY_HOURS);

      await this.userRepository.setVerificationToken(
        user.id,
        verificationToken,
        expiresAt
      );

      // 4b. Send welcome email with verification link
      try {
        await this.emailService.sendWelcomeEmail(user.email, {
          firstName: user.firstName || user.displayName || 'User',
          accountType: user.role,
          loginUrl: `${process.env.API_BASE_URL}/login`,
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail registration if email fails
      }

      // 5. Generate auth tokens
      const tokens = generateTokenPair(
        user.id,
        user.email,
        user.role
      );

      // 6. Store refresh token
      await this.storeRefreshToken(
        user.id,
        tokens.refreshToken,
        tokens.refreshTokenExpiresIn,
        clientInfo
      );

      // 7. Return user object (already sanitized by repository)
      return {
        success: true,
        user,
        tokens,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed',
      };
    }
  }

  // ==========================================================================
  // LOGIN
  // ==========================================================================

  /**
   * Authenticate user and generate tokens
   *
   * Process:
   * 1. Find user by email
   * 2. Check account status and locks
   * 3. Verify password
   * 4. Generate tokens
   * 5. Record successful login
   *
   * @param credentials - Login credentials
   * @param clientInfo - Client information for refresh token
   * @returns Auth result with user and tokens
   */
  async login(
    credentials: LoginUserDTO,
    clientInfo?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthResult> {
    try {
      // 1. Find user by email
      const user = await this.userRepository.findByEmail(credentials.email);
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // 2. Check if account is locked
      const isLocked = await this.userRepository.isAccountLocked(user.id);
      if (isLocked) {
        return {
          success: false,
          error: 'Account is temporarily locked due to too many failed login attempts. Try again in 15 minutes.',
        };
      }

      // 3. Check account status
      if (user.accountStatus !== AccountStatus.ACTIVE) {
        return {
          success: false,
          error: `Account is ${user.accountStatus}. Please contact support.`,
        };
      }

      // 4. Verify password
      const userWithPassword = user as UserWithPassword;
      const passwordValid = await this.verifyPassword(
        credentials.password,
        userWithPassword.passwordHash
      );

      if (!passwordValid) {
        // Record failed login attempt
        await this.userRepository.recordFailedLogin(user.id);

        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // 5. Generate tokens
      const tokens = generateTokenPair(user.id, user.email, user.role);

      // 6. Store refresh token
      await this.storeRefreshToken(
        user.id,
        tokens.refreshToken,
        tokens.refreshTokenExpiresIn,
        clientInfo
      );

      // 7. Record successful login (resets failed attempts)
      await this.userRepository.recordLogin(user.id);

      // 8. Return safe user object and tokens
      return {
        success: true,
        user: sanitizeUser(userWithPassword),
        tokens,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed',
      };
    }
  }

  // ==========================================================================
  // TOKEN REFRESH
  // ==========================================================================

  /**
   * Refresh access token using refresh token
   *
   * Process:
   * 1. Verify refresh token signature
   * 2. Check token exists in database
   * 3. Get user and verify status
   * 4. Generate new token pair
   * 5. Revoke old refresh token
   * 6. Store new refresh token
   *
   * @param refreshToken - Refresh token string
   * @param clientInfo - Client information
   * @returns New token pair or error
   */
  async refresh(
    refreshToken: string,
    clientInfo?: { userAgent?: string; ipAddress?: string }
  ): Promise<RefreshResult> {
    try {
      // 1. Verify token signature and expiration
      const verifyResult = verifyRefreshToken(refreshToken);
      if (!verifyResult.valid || !verifyResult.payload) {
        return {
          success: false,
          error: verifyResult.error || 'Invalid refresh token',
        };
      }

      // 2. Check token exists in database (not revoked)
      const tokenHash = hashToken(refreshToken);
      const storedToken = await this.userRepository.findRefreshToken(tokenHash);

      if (!storedToken) {
        return {
          success: false,
          error: 'Refresh token not found or has been revoked',
        };
      }

      // 3. Get user and verify account status
      const user = await this.userRepository.findById(verifyResult.payload.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (user.accountStatus !== AccountStatus.ACTIVE) {
        return {
          success: false,
          error: 'Account is not active',
        };
      }

      // 4. Generate new token pair
      const tokens = generateTokenPair(user.id, user.email, user.role);

      // 5. Revoke old refresh token (token rotation)
      await this.userRepository.revokeRefreshToken(tokenHash, 'Token refresh');

      // 6. Store new refresh token
      await this.storeRefreshToken(
        user.id,
        tokens.refreshToken,
        tokens.refreshTokenExpiresIn,
        clientInfo
      );

      return {
        success: true,
        tokens,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Token refresh failed',
      };
    }
  }

  // ==========================================================================
  // LOGOUT
  // ==========================================================================

  /**
   * Logout user by revoking refresh token
   *
   * @param refreshToken - Refresh token to revoke
   * @returns Success boolean
   */
  async logout(refreshToken: string): Promise<boolean> {
    try {
      const tokenHash = hashToken(refreshToken);
      await this.userRepository.revokeRefreshToken(tokenHash, 'User logout');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Logout from all devices by revoking all user's refresh tokens
   *
   * @param userId - User UUID
   * @returns Success boolean
   */
  async logoutAll(userId: string): Promise<boolean> {
    try {
      await this.userRepository.revokeAllUserTokens(userId, 'Logout all sessions');
      return true;
    } catch (error) {
      console.error('Logout all error:', error);
      return false;
    }
  }

  // ==========================================================================
  // EMAIL VERIFICATION
  // ==========================================================================

  /**
   * Verify user's email address
   *
   * @param token - Email verification token
   * @returns Success boolean
   */
  async verifyEmail(token: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findByVerificationToken(token);

      if (!user) {
        return false;
      }

      await this.userRepository.markEmailVerified(user.id);
      return true;
    } catch (error) {
      console.error('Email verification error:', error);
      return false;
    }
  }

  /**
   * Resend email verification
   *
   * @param email - User email
   * @returns Success boolean
   */
  async resendVerification(email: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findByEmail(email);

      if (!user || user.emailVerified) {
        return false;
      }

      const verificationToken = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFICATION_EXPIRY_HOURS);

      await this.userRepository.setVerificationToken(user.id, verificationToken, expiresAt);

      // Send verification email
      try {
        await this.emailService.sendWelcomeEmail(user.email, {
          firstName: user.firstName || user.displayName || 'User',
          accountType: user.role,
          loginUrl: `${process.env.API_BASE_URL}/login`,
        });
      } catch (emailError) {
        console.error('Failed to resend verification email:', emailError);
        // Still return true - token was created successfully
      }

      return true;
    } catch (error) {
      console.error('Resend verification error:', error);
      return false;
    }
  }

  // ==========================================================================
  // PASSWORD RESET
  // ==========================================================================

  /**
   * Initiate password reset process
   *
   * @param email - User email
   * @returns Success boolean (always returns true to prevent email enumeration)
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findByEmail(email);

      // Always return true to prevent email enumeration attacks
      if (!user) {
        return true;
      }

      const resetToken = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_EXPIRY_HOURS);

      await this.userRepository.setResetToken(user.id, resetToken, expiresAt);

      // Send password reset email
      try {
        const resetUrl = `${process.env.API_BASE_URL}/reset-password?token=${resetToken}`;
        const expiresAtDate = new Date();
        expiresAtDate.setHours(expiresAtDate.getHours() + PASSWORD_RESET_EXPIRY_HOURS);

        await this.emailService.sendPasswordReset(user.email, {
          resetToken,
          resetUrl,
          expiresAt: expiresAtDate.toISOString(),
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Still return true to prevent email enumeration
      }

      return true;
    } catch (error) {
      console.error('Password reset request error:', error);
      return true; // Still return true to prevent information disclosure
    }
  }

  /**
   * Reset password using reset token
   *
   * @param token - Password reset token
   * @param newPassword - New password
   * @returns Success boolean
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findByResetToken(token);

      if (!user) {
        return false;
      }

      const passwordHash = await this.hashPassword(newPassword);

      await this.userRepository.update(user.id, { passwordHash });
      await this.userRepository.clearResetToken(user.id);

      // Revoke all existing refresh tokens for security
      await this.userRepository.revokeAllUserTokens(user.id, 'Password reset');

      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      return false;
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Hash password with bcrypt
   *
   * @param password - Plain text password
   * @returns Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Verify password against hash
   *
   * @param password - Plain text password
   * @param hash - bcrypt hash
   * @returns True if password matches
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Store refresh token in database
   *
   * @param userId - User UUID
   * @param refreshToken - Refresh token string
   * @param expiresIn - Expiration time in seconds
   * @param clientInfo - Client information
   */
  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
    expiresIn: number,
    clientInfo?: { userAgent?: string; ipAddress?: string }
  ): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const tokenData: RefreshTokenDTO = {
      userId,
      tokenHash,
      expiresAt,
      userAgent: clientInfo?.userAgent,
      ipAddress: clientInfo?.ipAddress,
    };

    await this.userRepository.storeRefreshToken(tokenData);
  }
}

export default AuthService;
