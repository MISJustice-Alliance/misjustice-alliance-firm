/**
 * Authentication Routes
 *
 * API endpoints for user authentication and authorization.
 *
 * Endpoints:
 * - POST /api/auth/register - Register new user
 * - POST /api/auth/login - Authenticate user
 * - POST /api/auth/refresh - Refresh access token
 * - POST /api/auth/logout - Logout (revoke refresh token)
 * - POST /api/auth/logout-all - Logout from all devices
 * - GET /api/auth/verify - Verify current session
 * - POST /api/auth/verify-email - Verify email address
 * - POST /api/auth/resend-verification - Resend verification email
 * - POST /api/auth/forgot-password - Request password reset
 * - POST /api/auth/reset-password - Reset password
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/AuthService';
import { EmailService } from '../services/EmailService';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

// ============================================================================
// ROUTER SETUP
// ============================================================================

export function createAuthRoutes(db: Pool): Router {
  const router = Router();
  const emailService = new EmailService();
  const authService = new AuthService(db, emailService);

  // ==========================================================================
  // VALIDATION RULES
  // ==========================================================================

  const registerValidation = [
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name must be 1-100 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name must be 1-100 characters'),
    body('displayName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Display name must be 1-200 characters'),
  ];

  const loginValidation = [
    body('email').trim().isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ];

  const resetPasswordValidation = [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),
  ];

  // ==========================================================================
  // ROUTES
  // ==========================================================================

  /**
   * POST /api/auth/register
   * Register a new user account
   */
  router.post('/register', authRateLimiter, registerValidation, async (req: Request, res: Response) => {
    try {
      // 1. Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration data',
            details: errors.array(),
          },
        });
        return;
      }

      // 2. Extract client information
      const clientInfo = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      };

      // 3. Register user
      const result = await authService.register(req.body, clientInfo);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'REGISTRATION_FAILED',
            message: result.error || 'Registration failed',
          },
        });
        return;
      }

      // 4. Set refresh token in httpOnly cookie
      if (result.tokens) {
        res.cookie('refreshToken', result.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: result.tokens.refreshTokenExpiresIn * 1000,
        });
      }

      // 5. Return success with user and access token
      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.tokens?.accessToken,
          expiresIn: result.tokens?.accessTokenExpiresIn,
        },
        message: 'Registration successful. Please verify your email.',
      });
    } catch (error) {
      console.error('Register route error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Registration failed',
        },
      });
    }
  });

  /**
   * POST /api/auth/login
   * Authenticate user and generate tokens
   */
  router.post('/login', authRateLimiter, loginValidation, async (req: Request, res: Response) => {
    try {
      // 1. Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login credentials',
            details: errors.array(),
          },
        });
        return;
      }

      // 2. Extract client information
      const clientInfo = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      };

      // 3. Authenticate user
      const result = await authService.login(req.body, clientInfo);

      if (!result.success) {
        res.status(401).json({
          success: false,
          error: {
            code: 'LOGIN_FAILED',
            message: result.error || 'Invalid email or password',
          },
        });
        return;
      }

      // 4. Set refresh token in httpOnly cookie
      if (result.tokens) {
        res.cookie('refreshToken', result.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: result.tokens.refreshTokenExpiresIn * 1000,
        });
      }

      // 5. Return success with user and access token
      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.tokens?.accessToken,
          expiresIn: result.tokens?.accessTokenExpiresIn,
        },
      });
    } catch (error) {
      console.error('Login route error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed',
        },
      });
    }
  });

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      // 1. Get refresh token from cookie or body
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required',
          },
        });
        return;
      }

      // 2. Extract client information
      const clientInfo = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      };

      // 3. Refresh tokens
      const result = await authService.refresh(refreshToken, clientInfo);

      if (!result.success) {
        // Clear invalid refresh token cookie
        res.clearCookie('refreshToken');

        res.status(401).json({
          success: false,
          error: {
            code: 'REFRESH_FAILED',
            message: result.error || 'Token refresh failed',
          },
        });
        return;
      }

      // 4. Set new refresh token in httpOnly cookie
      if (result.tokens) {
        res.cookie('refreshToken', result.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: result.tokens.refreshTokenExpiresIn * 1000,
        });
      }

      // 5. Return new access token
      res.status(200).json({
        success: true,
        data: {
          accessToken: result.tokens?.accessToken,
          expiresIn: result.tokens?.accessTokenExpiresIn,
        },
      });
    } catch (error) {
      console.error('Refresh route error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Token refresh failed',
        },
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout user by revoking refresh token
   */
  router.post('/logout', async (req: Request, res: Response) => {
    try {
      // 1. Get refresh token
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

      if (refreshToken) {
        // 2. Revoke refresh token
        await authService.logout(refreshToken);
      }

      // 3. Clear refresh token cookie
      res.clearCookie('refreshToken');

      // 4. Return success
      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout route error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Logout failed',
        },
      });
    }
  });

  /**
   * POST /api/auth/logout-all
   * Logout from all devices (revoke all refresh tokens)
   */
  router.post('/logout-all', authenticate, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      // 1. Revoke all user tokens
      await authService.logoutAll(req.user.userId);

      // 2. Clear refresh token cookie
      res.clearCookie('refreshToken');

      // 3. Return success
      res.status(200).json({
        success: true,
        message: 'Logged out from all devices',
      });
    } catch (error) {
      console.error('Logout all route error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Logout failed',
        },
      });
    }
  });

  /**
   * GET /api/auth/verify
   * Verify current session and return user info
   */
  router.get('/verify', authenticate, (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        authenticated: true,
        user: {
          id: req.user.userId,
          email: req.user.email,
          role: req.user.role,
        },
      },
    });
  });

  /**
   * POST /api/auth/verify-email
   * Verify email address using verification token
   */
  router.post('/verify-email', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Verification token is required',
          },
        });
        return;
      }

      const success = await authService.verifyEmail(token);

      if (!success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VERIFICATION_FAILED',
            message: 'Invalid or expired verification token',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      console.error('Email verification route error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Email verification failed',
        },
      });
    }
  });

  /**
   * POST /api/auth/resend-verification
   * Resend email verification
   */
  router.post('/resend-verification', authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
          },
        });
        return;
      }

      await authService.resendVerification(email);

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If the email exists, a verification link has been sent',
      });
    } catch (error) {
      console.error('Resend verification route error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to resend verification email',
        },
      });
    }
  });

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  router.post('/forgot-password', authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
          },
        });
        return;
      }

      await authService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error) {
      console.error('Forgot password route error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process password reset request',
        },
      });
    }
  });

  /**
   * POST /api/auth/reset-password
   * Reset password using reset token
   */
  router.post('/reset-password', authRateLimiter, resetPasswordValidation, async (req: Request, res: Response) => {
    try {
      // 1. Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid password reset data',
            details: errors.array(),
          },
        });
        return;
      }

      const { token, newPassword } = req.body;

      // 2. Reset password
      const success = await authService.resetPassword(token, newPassword);

      if (!success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'RESET_FAILED',
            message: 'Invalid or expired reset token',
          },
        });
        return;
      }

      // 3. Return success
      res.status(200).json({
        success: true,
        message: 'Password reset successful. Please login with your new password.',
      });
    } catch (error) {
      console.error('Reset password route error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Password reset failed',
        },
      });
    }
  });

  return router;
}

export default createAuthRoutes;
