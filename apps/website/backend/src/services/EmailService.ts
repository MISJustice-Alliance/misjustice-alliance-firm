/**
 * Email Service
 * Handles all transactional email delivery via Mailgun
 * Architecture documented in: ARCHITECTURE.md Section 9
 */

import formData from 'form-data';
import Mailgun from 'mailgun.js';

// Define client type based on Mailgun's structure
type IMailgunClient = ReturnType<Mailgun['client']>;

// Mailgun StatsEvent type
type StatsEvent = 'accepted' | 'delivered' | 'failed' | 'opened' | 'clicked' | 'unsubscribed' | 'complained' | 'stored';

/**
 * Mailgun error response type
 */
export interface MailgunError {
  status?: number;
  message?: string;
  details?: string;
}

/**
 * Email statistics response from Mailgun
 */
export interface EmailStats {
  start: string;
  end: string;
  resolution: string;
  stats: Array<{
    time: string;
    accepted?: { incoming: number; outgoing: number; total: number };
    delivered?: { smtp: number; http: number; total: number };
    failed?: { temporary: { espblock: number; total: number }; permanent: { total: number } };
    opened?: { total: number };
    clicked?: { total: number };
    unsubscribed?: { total: number };
    complained?: { total: number };
    stored?: { total: number };
  }>;
}

/**
 * Parameters for email statistics query
 */
export interface EmailStatsParams {
  event: string;
  begin?: string;
  end?: string;
  tag?: string;
}

/**
 * Email template variable types
 */
export interface CaseSubmissionEmailVars {
  submissionId: string;
  submittedAt: string;
  sessionId: string;
  statusUrl: string;
}

export interface AdminNotificationEmailVars {
  caseNumber: string;
  submissionId: string;
  plaintiff: string;
  defendant: string;
  jurisdiction: string;
  submittedAt: string;
  reviewUrl: string;
}

export interface CaseStatusUpdateEmailVars {
  caseNumber: string;
  plaintiff: string;
  defendant: string;
  newStatus: string;
  updatedAt: string;
  viewCaseUrl: string;
  notes?: string;
}

export interface PasswordResetEmailVars {
  resetToken: string;
  resetUrl: string;
  expiresAt: string;
}

export interface WelcomeEmailVars {
  firstName: string;
  accountType: string;
  loginUrl: string;
}

export interface ContactFormEmailVars {
  message: string;
  senderEmail?: string;
  permissionToShare: boolean;
  submittedAt: string;
  hasAttachment: boolean;
  attachmentName?: string;
}

/**
 * Custom error class for email-related errors
 */
export class EmailServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public mailgunError?: MailgunError
  ) {
    super(message);
    this.name = 'EmailServiceError';
  }
}

/**
 * Mailgun email service for transactional emails
 *
 * Environment variables required:
 * - MAILGUN_API_KEY: Private API key from Mailgun
 * - MAILGUN_DOMAIN: Sending domain (e.g., send.misjusticealliance.org)
 * - MAILGUN_API_URL: API endpoint (default: https://api.mailgun.net)
 */
export class EmailService {
  private mg: IMailgunClient;
  private domain: string;
  private fromAddress: string;

  constructor() {
    // Validate required environment variables
    if (!process.env.MAILGUN_API_KEY) {
      throw new EmailServiceError(
        'MAILGUN_API_KEY environment variable is required',
        500
      );
    }

    if (!process.env.MAILGUN_DOMAIN) {
      throw new EmailServiceError(
        'MAILGUN_DOMAIN environment variable is required',
        500
      );
    }

    // Initialize Mailgun client
    const mailgun = new Mailgun(formData);
    this.mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: process.env.MAILGUN_API_URL || 'https://api.mailgun.net'
    });

    this.domain = process.env.MAILGUN_DOMAIN;
    this.fromAddress = 'MISJustice Alliance <noreply@misjusticealliance.org>';
  }

  /**
   * Send case submission confirmation email
   * Triggered when anonymous user submits a case
   * Template: case-submission-confirmation
   */
  async sendCaseSubmissionConfirmation(
    email: string,
    variables: CaseSubmissionEmailVars
  ): Promise<string> {
    if (!email || !this.validateEmail(email)) {
      throw new EmailServiceError('Valid email address is required', 400);
    }

    if (!variables.submissionId) {
      throw new EmailServiceError('Submission ID is required', 400);
    }

    try {
      const messageData = {
        from: this.fromAddress,
        to: email,
        subject: 'Case Submission Confirmation - MISJustice Alliance',
        template: 'case-submission-confirmation',
        'h:X-Mailgun-Variables': JSON.stringify(variables),
        'o:tag': ['case-submission', 'confirmation'],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true
      };

      const response = await this.mg.messages.create(this.domain, messageData);

      console.log('Case submission confirmation sent:', {
        email,
        messageId: response.id,
        submissionId: variables.submissionId
      });

      return response.id!;
    } catch (error) {
      console.error('Failed to send case submission confirmation:', error);
      throw new EmailServiceError(
        'Failed to send case submission confirmation email',
        500,
        error as MailgunError
      );
    }
  }

  /**
   * Send admin notification for new case submission
   * Triggered when case is submitted and needs review
   * Template: admin-new-case-notification
   */
  async sendAdminNotification(
    adminEmail: string,
    variables: AdminNotificationEmailVars
  ): Promise<string> {
    if (!adminEmail || !this.validateEmail(adminEmail)) {
      throw new EmailServiceError('Valid admin email address is required', 400);
    }

    if (!variables.caseNumber || !variables.submissionId) {
      throw new EmailServiceError('Case number and submission ID are required', 400);
    }

    try {
      const messageData = {
        from: this.fromAddress,
        to: adminEmail,
        subject: `[NEW CASE] ${variables.caseNumber} - ${variables.plaintiff} v. ${variables.defendant}`,
        template: 'admin-new-case-notification',
        'h:X-Mailgun-Variables': JSON.stringify(variables),
        'h:X-Priority': '1', // High priority
        'o:tag': ['admin-notification', 'new-case'],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true
      };

      const response = await this.mg.messages.create(this.domain, messageData);

      console.log('Admin notification sent:', {
        adminEmail,
        messageId: response.id,
        caseNumber: variables.caseNumber
      });

      return response.id!;
    } catch (error) {
      console.error('Failed to send admin notification:', error);
      throw new EmailServiceError(
        'Failed to send admin notification',
        500,
        error as MailgunError
      );
    }
  }

  /**
   * Send case status update notification
   * Triggered when case status changes (e.g., Pending → Under Review → Published)
   * Template: case-status-update
   */
  async sendCaseStatusUpdate(
    email: string,
    variables: CaseStatusUpdateEmailVars
  ): Promise<string> {
    if (!email || !this.validateEmail(email)) {
      throw new EmailServiceError('Valid email address is required', 400);
    }

    if (!variables.caseNumber || !variables.newStatus) {
      throw new EmailServiceError('Case number and new status are required', 400);
    }

    try {
      const messageData = {
        from: this.fromAddress,
        to: email,
        subject: `Case Status Update: ${variables.caseNumber} - Now ${variables.newStatus}`,
        template: 'case-status-update',
        'h:X-Mailgun-Variables': JSON.stringify(variables),
        'o:tag': ['case-status-update', variables.newStatus.toLowerCase()],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true
      };

      const response = await this.mg.messages.create(this.domain, messageData);

      console.log('Case status update sent:', {
        email,
        messageId: response.id,
        caseNumber: variables.caseNumber,
        newStatus: variables.newStatus
      });

      return response.id!;
    } catch (error) {
      console.error('Failed to send case status update:', error);
      throw new EmailServiceError(
        'Failed to send status update email',
        500,
        error as MailgunError
      );
    }
  }

  /**
   * Send password reset email
   * Triggered when user requests password reset
   * Template: password-reset
   */
  async sendPasswordReset(
    email: string,
    variables: PasswordResetEmailVars
  ): Promise<string> {
    if (!email || !this.validateEmail(email)) {
      throw new EmailServiceError('Valid email address is required', 400);
    }

    if (!variables.resetToken || !variables.resetUrl) {
      throw new EmailServiceError('Reset token and URL are required', 400);
    }

    try {
      const messageData = {
        from: this.fromAddress,
        to: email,
        subject: 'Password Reset Request - MISJustice Alliance',
        template: 'password-reset',
        'h:X-Mailgun-Variables': JSON.stringify(variables),
        'o:tag': ['password-reset', 'security'],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true
      };

      const response = await this.mg.messages.create(this.domain, messageData);

      console.log('Password reset email sent:', {
        email,
        messageId: response.id
      });

      return response.id!;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new EmailServiceError(
        'Failed to send password reset email',
        500,
        error as MailgunError
      );
    }
  }

  /**
   * Send welcome email to new users
   * Triggered when user account is created
   * Template: welcome-email
   */
  async sendWelcomeEmail(
    email: string,
    variables: WelcomeEmailVars
  ): Promise<string> {
    if (!email || !this.validateEmail(email)) {
      throw new EmailServiceError('Valid email address is required', 400);
    }

    if (!variables.firstName) {
      throw new EmailServiceError('First name is required', 400);
    }

    try {
      const messageData = {
        from: this.fromAddress,
        to: email,
        subject: 'Welcome to MISJustice Alliance',
        template: 'welcome-email',
        'h:X-Mailgun-Variables': JSON.stringify(variables),
        'o:tag': ['welcome-email', 'onboarding'],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true
      };

      const response = await this.mg.messages.create(this.domain, messageData);

      console.log('Welcome email sent:', {
        email,
        messageId: response.id
      });

      return response.id!;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw new EmailServiceError(
        'Failed to send welcome email',
        500,
        error as MailgunError
      );
    }
  }

  /**
   * Validate email address format
   * Basic RFC 5322 validation
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Send bulk emails (for weekly digest, newsletter, etc.)
   * Uses batch sending API for efficiency
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    template: string,
    variables: Record<string, any>,
    tags: string[] = []
  ): Promise<string[]> {
    if (!recipients || recipients.length === 0) {
      throw new EmailServiceError('At least one recipient is required', 400);
    }

    if (recipients.length > 1000) {
      throw new EmailServiceError('Maximum 1000 recipients per batch', 400);
    }

    // Validate all emails
    const invalidEmails = recipients.filter(email => !this.validateEmail(email));
    if (invalidEmails.length > 0) {
      throw new EmailServiceError(
        `Invalid email addresses: ${invalidEmails.join(', ')}`,
        400
      );
    }

    try {
      const messageData = {
        from: this.fromAddress,
        to: recipients,
        subject,
        template,
        'h:X-Mailgun-Variables': JSON.stringify(variables),
        'o:tag': tags,
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true
      };

      const response = await this.mg.messages.create(this.domain, messageData);

      console.log('Bulk email sent:', {
        recipientCount: recipients.length,
        messageId: response.id,
        template
      });

      return [response.id!];
    } catch (error) {
      console.error('Failed to send bulk email:', error);
      throw new EmailServiceError(
        'Failed to send bulk email',
        500,
        error as MailgunError
      );
    }
  }

  /**
   * Send contact form submission to admin
   * Sends to admin@misjusticealliance.org and optionally copies the sender
   */
  async sendContactFormEmail(
    variables: ContactFormEmailVars,
    attachment?: { filename: string; data: Buffer; contentType: string }
  ): Promise<{ adminMessageId: string; senderMessageId?: string }> {
    const adminEmail = 'admin@misjusticealliance.org';
    const notificationsFrom = 'MISJustice Alliance <noreply@notifications.misjusticealliance.org>';

    // Format the email body
    const permissionStatus = variables.permissionToShare
      ? '✅ YES - Permission granted to share this correspondence'
      : '❌ NO - Permission NOT granted to share this correspondence';

    const emailBody = `
New Contact Form Submission
============================

Submitted: ${variables.submittedAt}
Sender Email: ${variables.senderEmail || 'Not provided (anonymous)'}

Permission to Share:
${permissionStatus}

${variables.hasAttachment ? `Attachment: ${variables.attachmentName}` : 'No attachment'}

Message:
--------
${variables.message}

============================
This message was sent via the MISJustice Alliance contact form.
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #1e3a5f; color: white; padding: 20px; }
    .content { padding: 20px; }
    .permission-yes { background: #d4edda; border: 1px solid #c3e6cb; padding: 10px; border-radius: 4px; }
    .permission-no { background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 4px; }
    .message-box { background: #f8f9fa; border-left: 4px solid #1e3a5f; padding: 15px; margin: 15px 0; }
    .meta { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="header">
    <h2>New Contact Form Submission</h2>
  </div>
  <div class="content">
    <p class="meta"><strong>Submitted:</strong> ${variables.submittedAt}</p>
    <p class="meta"><strong>Sender Email:</strong> ${variables.senderEmail || 'Not provided (anonymous)'}</p>

    <div class="${variables.permissionToShare ? 'permission-yes' : 'permission-no'}">
      <strong>Permission to Share:</strong><br>
      ${permissionStatus}
    </div>

    ${variables.hasAttachment ? `<p><strong>Attachment:</strong> ${variables.attachmentName}</p>` : ''}

    <h3>Message:</h3>
    <div class="message-box">
      ${variables.message.replace(/\n/g, '<br>')}
    </div>

    <hr>
    <p class="meta">This message was sent via the MISJustice Alliance contact form.</p>
  </div>
</body>
</html>
    `.trim();

    try {
      // Build admin email data
      const adminMessageData = {
        from: this.fromAddress,
        to: adminEmail,
        subject: `[Contact Form] ${variables.senderEmail ? `From: ${variables.senderEmail}` : 'Anonymous Submission'}`,
        text: emailBody,
        html: htmlBody,
        'o:tag': ['contact-form', 'submission'],
        'o:tracking': false, // Don't track contact form emails for privacy
        ...(attachment && {
          attachment: [{
            filename: attachment.filename,
            data: attachment.data,
            contentType: attachment.contentType,
          }],
        }),
      };

      const adminResponse = await this.mg.messages.create(this.domain, adminMessageData as any);

      console.log('Contact form email sent to admin:', {
        messageId: adminResponse.id,
        hasAttachment: variables.hasAttachment,
      });

      let senderMessageId: string | undefined;

      // Send copy to sender if they provided email
      if (variables.senderEmail && this.validateEmail(variables.senderEmail)) {
        const senderEmailBody = `
Thank you for contacting MISJustice Alliance
=============================================

We have received your message and will review it carefully.

Below is a copy of your submission for your records:

Submitted: ${variables.submittedAt}
Permission to Share: ${variables.permissionToShare ? 'Yes' : 'No'}
${variables.hasAttachment ? `Attachment: ${variables.attachmentName}` : ''}

Your Message:
-------------
${variables.message}

=============================================
This is an automated confirmation. Please do not reply to this email.
For secure communication, use our Session Messenger or encrypted email options at:
https://misjusticealliance.org/contact
        `.trim();

        const senderHtmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #1e3a5f; color: white; padding: 20px; }
    .content { padding: 20px; }
    .message-box { background: #f8f9fa; border-left: 4px solid #1e3a5f; padding: 15px; margin: 15px 0; }
    .meta { color: #666; font-size: 0.9em; }
    .footer { background: #f8f9fa; padding: 15px; margin-top: 20px; font-size: 0.85em; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Thank You for Contacting MISJustice Alliance</h2>
  </div>
  <div class="content">
    <p>We have received your message and will review it carefully.</p>
    <p>Below is a copy of your submission for your records:</p>

    <p class="meta"><strong>Submitted:</strong> ${variables.submittedAt}</p>
    <p class="meta"><strong>Permission to Share:</strong> ${variables.permissionToShare ? 'Yes' : 'No'}</p>
    ${variables.hasAttachment ? `<p class="meta"><strong>Attachment:</strong> ${variables.attachmentName}</p>` : ''}

    <h3>Your Message:</h3>
    <div class="message-box">
      ${variables.message.replace(/\n/g, '<br>')}
    </div>

    <div class="footer">
      <p>This is an automated confirmation. Please do not reply to this email.</p>
      <p>For secure communication, use our <a href="https://misjusticealliance.org/contact">Session Messenger or encrypted email options</a>.</p>
    </div>
  </div>
</body>
</html>
        `.trim();

        const senderMessageData = {
          from: notificationsFrom,
          to: variables.senderEmail,
          subject: 'Your Message to MISJustice Alliance - Confirmation',
          text: senderEmailBody,
          html: senderHtmlBody,
          'o:tag': ['contact-form', 'confirmation'],
          'o:tracking': false,
        };

        const senderResponse = await this.mg.messages.create(this.domain, senderMessageData as any);
        senderMessageId = senderResponse.id!;

        console.log('Contact form confirmation sent to sender:', {
          email: variables.senderEmail,
          messageId: senderMessageId,
        });
      }

      return {
        adminMessageId: adminResponse.id!,
        senderMessageId,
      };
    } catch (error) {
      console.error('Failed to send contact form email:', error);
      throw new EmailServiceError(
        'Failed to send contact form email',
        500,
        error as MailgunError
      );
    }
  }

  /**
   * Get email delivery statistics
   * Useful for monitoring and analytics
   */
  async getEmailStats(
    tag: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<EmailStats> {
    try {
      const events: StatsEvent[] = ['accepted', 'delivered', 'failed', 'opened', 'clicked'];
      const params = {
        event: events,
        ...(startDate && { begin: startDate.toISOString() }),
        ...(endDate && { end: endDate.toISOString() }),
        ...(tag && { tag })
      };

      const stats = await this.mg.stats.getDomain(this.domain, params);
      return stats as unknown as EmailStats;
    } catch (error) {
      console.error('Failed to get email stats:', error);
      throw new EmailServiceError(
        'Failed to retrieve email statistics',
        500,
        error as MailgunError
      );
    }
  }
}
