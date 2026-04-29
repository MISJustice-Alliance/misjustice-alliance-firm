/**
 * EmailService Unit Tests
 *
 * Comprehensive tests for Mailgun email service integration
 * Coverage areas:
 * - Email sending (all 6 methods)
 * - Email validation
 * - Error handling
 * - Template rendering
 * - Environment configuration
 */

import { EmailService, EmailServiceError } from '../../src/services/EmailService';

// Mock mailgun.js and form-data
jest.mock('mailgun.js');
jest.mock('form-data');

// Mock Mailgun client interface
interface MockMailgunClient {
  messages: {
    create: jest.Mock;
  };
}

describe('EmailService', () => {
  let emailService: EmailService;
  let mockMailgunClient: MockMailgunClient;
  let mockMessagesCreate: jest.Mock;

  // Store original env vars
  const originalEnv = process.env;

  beforeAll(() => {
    // Set required environment variables for testing
    process.env.MAILGUN_API_KEY = 'test-api-key-123';
    process.env.MAILGUN_DOMAIN = 'test.example.com';
    process.env.MAILGUN_API_URL = 'https://api.mailgun.net';
  });

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    process.env.MAILGUN_API_KEY = 'test-api-key-123';
    process.env.MAILGUN_DOMAIN = 'test.example.com';
    process.env.MAILGUN_API_URL = 'https://api.mailgun.net';

    // Create mock Mailgun client
    mockMessagesCreate = jest.fn().mockResolvedValue({
      id: '<test-message-id@example.com>',
      status: 'queued',
    });

    mockMailgunClient = {
      messages: {
        create: mockMessagesCreate,
      },
    };

    // Mock Mailgun constructor
    const Mailgun = require('mailgun.js');
    Mailgun.mockImplementation(() => ({
      client: jest.fn().mockReturnValue(mockMailgunClient),
    }));

    // Create fresh EmailService instance
    emailService = new EmailService();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  // ==========================================================================
  // CONSTRUCTOR & INITIALIZATION
  // ==========================================================================

  describe('Constructor', () => {
    it('should initialize with environment variables', () => {
      expect(emailService).toBeDefined();
      expect(emailService).toBeInstanceOf(EmailService);
    });

    it('should throw if MAILGUN_API_KEY is missing', () => {
      delete process.env.MAILGUN_API_KEY;
      expect(() => new EmailService()).toThrow('MAILGUN_API_KEY environment variable is required');
    });

    it('should throw if MAILGUN_DOMAIN is missing', () => {
      delete process.env.MAILGUN_DOMAIN;
      expect(() => new EmailService()).toThrow('MAILGUN_DOMAIN environment variable is required');
    });

    it('should use default API URL if not provided', () => {
      delete process.env.MAILGUN_API_URL;
      const service = new EmailService();
      expect(service).toBeDefined();
    });
  });

  // ==========================================================================
  // EMAIL VALIDATION
  // ==========================================================================

  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user+tag@domain.co.uk',
        'first.last@subdomain.example.com',
        'user123@test-domain.com',
      ];

      validEmails.forEach(email => {
        expect(emailService['validateEmail'](email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@.com',
      ];

      invalidEmails.forEach(email => {
        expect(emailService['validateEmail'](email)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // CASE SUBMISSION CONFIRMATION EMAIL
  // ==========================================================================

  describe('sendCaseSubmissionConfirmation()', () => {
    const testEmail = 'user@example.com';
    const testVariables = {
      submissionId: 'SUB-2026-001',
      submittedAt: '2026-01-02T10:00:00Z',
      sessionId: 'session-abc123',
      statusUrl: 'https://example.com/status/SUB-2026-001',
    };

    it('should send case submission confirmation email successfully', async () => {
      const messageId = await emailService.sendCaseSubmissionConfirmation(testEmail, testVariables);

      expect(messageId).toBe('<test-message-id@example.com>');
      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          from: 'MISJustice Alliance <noreply@misjusticealliance.org>',
          to: testEmail,
          subject: 'Case Submission Confirmation - MISJustice Alliance',
          template: 'case-submission-confirmation',
          'h:X-Mailgun-Variables': JSON.stringify(testVariables),
          'o:tag': ['case-submission', 'confirmation'],
          'o:tracking': true,
        })
      );
    });

    it('should throw error if email is invalid', async () => {
      await expect(
        emailService.sendCaseSubmissionConfirmation('invalid-email', testVariables)
      ).rejects.toThrow(EmailServiceError);
    });

    it('should throw error if Mailgun API fails', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('API Error'));

      await expect(
        emailService.sendCaseSubmissionConfirmation(testEmail, testVariables)
      ).rejects.toThrow('Failed to send case submission confirmation email');
    });
  });

  // ==========================================================================
  // ADMIN NOTIFICATION EMAIL
  // ==========================================================================

  describe('sendAdminNotification()', () => {
    const testEmail = 'admin@example.com';
    const testVariables = {
      caseNumber: 'CASE-2026-001',
      submissionId: 'SUB-2026-001',
      plaintiff: 'John Doe',
      defendant: 'City Police Department',
      jurisdiction: 'California',
      submittedAt: '2026-01-02T10:00:00Z',
      reviewUrl: 'https://example.com/admin/review/SUB-2026-001',
    };

    it('should send admin notification email successfully', async () => {
      const messageId = await emailService.sendAdminNotification(testEmail, testVariables);

      expect(messageId).toBe('<test-message-id@example.com>');
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          subject: `[NEW CASE] ${testVariables.caseNumber} - ${testVariables.plaintiff} v. ${testVariables.defendant}`,
          template: 'admin-new-case-notification',
          'o:tag': ['admin-notification', 'new-case'],
        })
      );
    });

  });

  // ==========================================================================
  // CASE STATUS UPDATE EMAIL
  // ==========================================================================

  describe('sendCaseStatusUpdate()', () => {
    const testEmail = 'user@example.com';
    const testVariables = {
      caseNumber: 'CASE-2026-001',
      plaintiff: 'John Doe',
      defendant: 'City Police Department',
      newStatus: 'in_review',
      updatedAt: '2026-01-03T14:30:00Z',
      viewCaseUrl: 'https://example.com/cases/CASE-2026-001',
      notes: 'Your case is now under review by our legal team',
    };

    it('should send case status update email successfully', async () => {
      const messageId = await emailService.sendCaseStatusUpdate(testEmail, testVariables);

      expect(messageId).toBe('<test-message-id@example.com>');
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          subject: `Case Status Update: ${testVariables.caseNumber} - Now ${testVariables.newStatus}`,
          template: 'case-status-update',
          'o:tag': ['case-status-update', testVariables.newStatus.toLowerCase()],
        })
      );
    });
  });

  // ==========================================================================
  // PASSWORD RESET EMAIL
  // ==========================================================================

  describe('sendPasswordReset()', () => {
    const testEmail = 'user@example.com';
    const testVariables = {
      resetToken: 'abc123def456',
      resetUrl: 'https://example.com/reset-password?token=abc123',
      expiresAt: '2026-01-02T11:00:00Z',
    };

    it('should send password reset email successfully', async () => {
      const messageId = await emailService.sendPasswordReset(testEmail, testVariables);

      expect(messageId).toBe('<test-message-id@example.com>');
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          subject: 'Password Reset Request - MISJustice Alliance',
          template: 'password-reset',
          'o:tag': ['password-reset', 'security'],
        })
      );
    });

    it('should validate email before sending', async () => {
      await expect(
        emailService.sendPasswordReset('', testVariables)
      ).rejects.toThrow('Valid email address is required');
    });
  });

  // ==========================================================================
  // WELCOME EMAIL
  // ==========================================================================

  describe('sendWelcomeEmail()', () => {
    const testEmail = 'newuser@example.com';
    const testVariables = {
      firstName: 'Jane',
      accountType: 'viewer',
      loginUrl: 'https://example.com/login',
    };

    it('should send welcome email successfully', async () => {
      const messageId = await emailService.sendWelcomeEmail(testEmail, testVariables);

      expect(messageId).toBe('<test-message-id@example.com>');
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          subject: 'Welcome to MISJustice Alliance',
          template: 'welcome-email',
          'o:tag': ['welcome-email', 'onboarding'],
        })
      );
    });
  });

  // ==========================================================================
  // BULK EMAIL
  // ==========================================================================

  describe('sendBulkEmail()', () => {
    const testRecipients = [
      'user1@example.com',
      'user2@example.com',
      'user3@example.com',
    ];
    const testSubject = 'Monthly Newsletter';
    const testTemplate = 'newsletter-digest';
    const testVariables = {
      month: 'January',
      year: '2026',
      messageBody: 'This is a test newsletter',
      unsubscribeUrl: 'https://example.com/unsubscribe',
    };
    const testTags = ['bulk-email', 'newsletter'];

    it('should send bulk email successfully', async () => {
      // sendBulkEmail returns string[] (array of message IDs)
      mockMessagesCreate.mockResolvedValueOnce({
        id: '<bulk-message-id@example.com>',
        status: 'queued',
      });

      const messageIds = await emailService.sendBulkEmail(
        testRecipients,
        testSubject,
        testTemplate,
        testVariables,
        testTags
      );

      expect(messageIds).toBeDefined();
      expect(Array.isArray(messageIds)).toBe(true);
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          to: testRecipients,
          subject: testSubject,
          template: testTemplate,
          'o:tag': testTags,
        })
      );
    });

    it('should throw error for empty recipient list', async () => {
      await expect(
        emailService.sendBulkEmail([], testSubject, testTemplate, testVariables)
      ).rejects.toThrow('At least one recipient is required');
    });

    it('should validate all recipient emails', async () => {
      const invalidRecipients = ['user1@example.com', 'invalid-email', 'user3@example.com'];

      await expect(
        emailService.sendBulkEmail(invalidRecipients, testSubject, testTemplate, testVariables)
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('Error Handling', () => {
    it('should wrap Mailgun errors with context', async () => {
      const mailgunError = {
        status: 400,
        message: 'Invalid domain',
        details: 'Domain not verified',
      };
      mockMessagesCreate.mockRejectedValueOnce(mailgunError);

      try {
        await emailService.sendWelcomeEmail('test@example.com', {
          firstName: 'Test',
          accountType: 'viewer',
          loginUrl: 'http://example.com/login',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailServiceError);
        expect((error as EmailServiceError).statusCode).toBe(500);
        expect((error as EmailServiceError).mailgunError).toEqual(mailgunError);
      }
    });

    it('should handle network errors', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(
        emailService.sendWelcomeEmail('test@example.com', {
          firstName: 'Test',
          accountType: 'viewer',
          loginUrl: 'http://example.com/login',
        })
      ).rejects.toThrow('Failed to send welcome email');
    });

    it('should provide detailed error messages', async () => {
      mockMessagesCreate.mockRejectedValueOnce({
        status: 401,
        message: 'Unauthorized',
      });

      try {
        await emailService.sendPasswordReset('test@example.com', {
          resetToken: 'test-token-123',
          resetUrl: 'http://example.com/reset?token=test-token-123',
          expiresAt: '2026-01-02T11:00:00Z',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(EmailServiceError);
        expect((error as EmailServiceError).message).toContain('Failed to send password reset email');
        expect((error as EmailServiceError).statusCode).toBe(500);
      }
    });
  });

  // ==========================================================================
  // EMAIL SERVICE ERROR CLASS
  // ==========================================================================

  describe('EmailServiceError', () => {
    it('should create error with message and status code', () => {
      const error = new EmailServiceError('Test error', 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(EmailServiceError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('EmailServiceError');
    });

    it('should include mailgun error details', () => {
      const mailgunError = { status: 400, message: 'Bad request' };
      const error = new EmailServiceError('Test error', 400, mailgunError);

      expect(error.mailgunError).toEqual(mailgunError);
    });

    it('should default to 500 status code', () => {
      const error = new EmailServiceError('Test error');
      expect(error.statusCode).toBe(500);
    });
  });
});
