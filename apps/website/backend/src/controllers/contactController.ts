/**
 * Contact Controller
 * HTTP request handlers for contact form endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { EmailService, ContactFormEmailVars } from '../services/EmailService';
import { logger } from '../utils/logger';

// Initialize email service lazily to handle missing env vars gracefully
let emailService: EmailService | null = null;

function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
}

/**
 * Submit contact form
 * POST /api/contact
 *
 * Body (multipart/form-data):
 * - message: string (required, max 2000 chars)
 * - email: string (optional)
 * - permissionToShare: boolean (required)
 * - attachment: file (optional, max 10MB)
 */
export async function submitContactForm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { message, email, permissionToShare } = req.body;
    const attachment = req.file;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message is required',
        },
      });
      return;
    }

    // Validate message length
    if (message.length > 2000) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message must be 2000 characters or less',
        },
      });
      return;
    }

    if (message.trim().length < 10) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message must be at least 10 characters',
        },
      });
      return;
    }

    // Validate permissionToShare
    const hasPermission = permissionToShare === 'true' || permissionToShare === true;

    // Validate email format if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
        },
      });
      return;
    }

    // Prepare email variables
    const emailVars: ContactFormEmailVars = {
      message: message.trim(),
      senderEmail: email || undefined,
      permissionToShare: hasPermission,
      submittedAt: new Date().toISOString(),
      hasAttachment: !!attachment,
      attachmentName: attachment?.originalname,
    };

    // Prepare attachment data if present
    let attachmentData: { filename: string; data: Buffer; contentType: string } | undefined;
    if (attachment) {
      attachmentData = {
        filename: attachment.originalname,
        data: attachment.buffer,
        contentType: attachment.mimetype,
      };
    }

    // Send email
    const service = getEmailService();
    const result = await service.sendContactFormEmail(emailVars, attachmentData);

    logger.info('Contact form submitted successfully', {
      hasEmail: !!email,
      hasAttachment: !!attachment,
      permissionToShare: hasPermission,
      adminMessageId: result.adminMessageId,
      senderMessageId: result.senderMessageId,
    });

    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully',
      data: {
        confirmationSent: !!result.senderMessageId,
      },
    });
  } catch (error) {
    logger.error('Contact form submission failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Check if it's an email service error (missing config)
    if (error instanceof Error && error.message.includes('environment variable is required')) {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Contact form is temporarily unavailable. Please try our other contact methods.',
        },
      });
      return;
    }

    next(error);
  }
}
