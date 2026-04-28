/**
 * Webhook Routes
 *
 * API endpoints for external service webhooks (Mailgun, etc.)
 *
 * Endpoints:
 * - POST /api/webhooks/mailgun - Mailgun email events webhook
 *
 * Security:
 * - Mailgun webhooks use HMAC-SHA256 signature verification
 * - No authentication middleware (verified via signature)
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Mailgun webhook event data structure
 * See: https://documentation.mailgun.com/en/latest/api-events.html
 */
interface MailgunEventData {
  event: string; // 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'complained' | 'unsubscribed'
  timestamp: number;
  recipient: string;
  message: {
    headers: {
      'message-id': string;
      to: string;
      from: string;
      subject: string;
    };
  };
  tags?: string[];
  'user-variables'?: Record<string, string>;

  // Event-specific fields
  'delivery-status'?: {
    message: string;
    code: number;
  };
  url?: string; // For 'clicked' events
  'client-info'?: {
    'client-name': string;
    'client-os': string;
    'device-type': string;
    'user-agent': string;
  };
  'geolocation'?: {
    country: string;
    region: string;
    city: string;
  };
  reason?: string; // For 'bounced', 'failed' events
  error?: string; // For 'failed' events
}

interface MailgunWebhookPayload {
  signature: {
    timestamp: string;
    token: string;
    signature: string;
  };
  'event-data': MailgunEventData;
}

// ============================================================================
// ROUTER SETUP
// ============================================================================

export function createWebhookRoutes(db: Pool): Router {
  const router = Router();

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  /**
   * Verify Mailgun webhook signature using HMAC-SHA256
   * See: https://documentation.mailgun.com/en/latest/user_manual.html#webhooks
   */
  function verifyMailgunSignature(
    timestamp: string,
    token: string,
    signature: string
  ): boolean {
    const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

    if (!signingKey) {
      console.error('MAILGUN_WEBHOOK_SIGNING_KEY not configured');
      return false;
    }

    // Create HMAC with timestamp and token
    const data = `${timestamp}${token}`;
    const hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(data);
    const computedSignature = hmac.digest('hex');

    // Ensure both buffers are same length before comparison
    // (timingSafeEqual throws if lengths differ)
    if (signature.length !== computedSignature.length) {
      console.warn('Webhook signature length mismatch');
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(computedSignature, 'hex')
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Store email event in audit logs table
   */
  async function logEmailEvent(eventData: MailgunEventData): Promise<void> {
    try {
      const query = `
        INSERT INTO email_audit_logs (
          event_type,
          recipient,
          subject,
          message_id,
          timestamp,
          tags,
          user_variables,
          client_info,
          geolocation,
          delivery_status,
          url_clicked,
          reason,
          error_message,
          raw_event_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;

      const values = [
        eventData.event,
        eventData.recipient,
        eventData.message?.headers?.subject || null,
        eventData.message?.headers?.['message-id'] || null,
        new Date(eventData.timestamp * 1000), // Convert Unix timestamp to Date
        eventData.tags ? JSON.stringify(eventData.tags) : null,
        eventData['user-variables'] ? JSON.stringify(eventData['user-variables']) : null,
        eventData['client-info'] ? JSON.stringify(eventData['client-info']) : null,
        eventData.geolocation ? JSON.stringify(eventData.geolocation) : null,
        eventData['delivery-status'] ? JSON.stringify(eventData['delivery-status']) : null,
        eventData.url || null,
        eventData.reason || null,
        eventData.error || null,
        JSON.stringify(eventData)
      ];

      await db.query(query, values);

      console.log('Email event logged:', {
        event: eventData.event,
        recipient: eventData.recipient,
        timestamp: new Date(eventData.timestamp * 1000).toISOString()
      });
    } catch (error) {
      console.error('Failed to log email event:', error);
      // Don't throw - we still want to return 200 to Mailgun
    }
  }

  // ==========================================================================
  // WEBHOOK ENDPOINTS
  // ==========================================================================

  /**
   * POST /api/webhooks/mailgun
   *
   * Receives webhook events from Mailgun for email tracking
   *
   * Events handled:
   * - delivered: Email successfully delivered
   * - opened: Email opened by recipient
   * - clicked: Link clicked in email
   * - bounced: Email bounced (hard/soft bounce)
   * - failed: Email delivery failed
   * - complained: Recipient marked as spam
   * - unsubscribed: Recipient unsubscribed
   *
   * Security: HMAC-SHA256 signature verification
   */
  router.post('/mailgun', async (req: Request, res: Response) => {
    try {
      const payload = req.body as MailgunWebhookPayload;

      // Validate payload structure
      if (!payload.signature || !payload['event-data']) {
        console.error('Invalid webhook payload structure');
        return res.status(400).json({
          success: false,
          error: 'Invalid payload structure'
        });
      }

      const { timestamp, token, signature } = payload.signature;
      const eventData = payload['event-data'];

      // Verify webhook signature
      const isValid = verifyMailgunSignature(timestamp, token, signature);

      if (!isValid) {
        console.error('Invalid webhook signature');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - invalid signature'
        });
      }

      // Check timestamp to prevent replay attacks (within 15 minutes)
      const timestampDate = new Date(parseInt(timestamp) * 1000);
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

      if (timestampDate < fifteenMinutesAgo) {
        console.warn('Webhook timestamp too old (potential replay attack)');
        return res.status(401).json({
          success: false,
          error: 'Webhook timestamp expired'
        });
      }

      // Log event to database
      await logEmailEvent(eventData);

      // Handle specific event types (optional business logic)
      switch (eventData.event) {
        case 'bounced':
        case 'failed':
          // TODO: Mark email as invalid, update user record
          console.warn(`Email delivery issue for ${eventData.recipient}:`, {
            event: eventData.event,
            reason: eventData.reason,
            error: eventData.error
          });
          break;

        case 'complained':
          // TODO: Add to suppression list, investigate spam complaints
          console.warn(`Spam complaint from ${eventData.recipient}`);
          break;

        case 'unsubscribed':
          // TODO: Update user preferences, add to suppression list
          console.log(`User unsubscribed: ${eventData.recipient}`);
          break;

        case 'delivered':
          console.log(`Email delivered to ${eventData.recipient}`);
          break;

        case 'opened':
          console.log(`Email opened by ${eventData.recipient}`);
          break;

        case 'clicked':
          console.log(`Link clicked by ${eventData.recipient}: ${eventData.url}`);
          break;

        default:
          console.log(`Unhandled event type: ${eventData.event}`);
      }

      // Always return 200 OK to Mailgun (prevents retries)
      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });

    } catch (error) {
      console.error('Error processing Mailgun webhook:', error);

      // Still return 200 to prevent Mailgun retries
      // Log error for investigation
      return res.status(200).json({
        success: false,
        message: 'Webhook received but processing failed'
      });
    }
  });

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  /**
   * GET /api/webhooks/health
   *
   * Health check endpoint for webhook service
   */
  router.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      service: 'webhooks',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  return router;
}
