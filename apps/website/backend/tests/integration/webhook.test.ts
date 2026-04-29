/**
 * Webhook Integration Tests
 *
 * Tests Mailgun webhook endpoint with:
 * - Signature verification (HMAC-SHA256)
 * - Timestamp validation (replay attack prevention)
 * - Event logging to database
 * - Error handling
 * - Multiple event types
 *
 * Test coverage:
 * - Valid webhook requests
 * - Invalid signatures
 * - Expired timestamps
 * - Invalid payload structures
 * - Event type handling
 * - Database persistence
 */

import request from 'supertest';
import { Pool } from 'pg';
import crypto from 'crypto';
import express, { Application } from 'express';
import { createWebhookRoutes } from '../../src/routes/webhooks';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('Webhook Routes Integration Tests', () => {
  let app: Application;
  let db: Pool;
  let signingKey: string;

  // Store original env vars
  const originalEnv = process.env;

  beforeAll(async () => {
    // Setup test environment
    process.env.MAILGUN_WEBHOOK_SIGNING_KEY = 'test-signing-key-12345';
    signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

    // Create database connection pool
    db = new Pool({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME || 'misjustice_dev',
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
    });

    // Setup Express app with webhook routes
    app = express();
    app.use(express.json());
    app.use('/api/webhooks', createWebhookRoutes(db));

    // Ensure email_audit_logs table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(50) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(500),
        message_id VARCHAR(255),
        timestamp TIMESTAMP NOT NULL,
        tags JSONB,
        user_variables JSONB,
        client_info JSONB,
        geolocation JSONB,
        delivery_status JSONB,
        url_clicked TEXT,
        reason TEXT,
        error_message TEXT,
        raw_event_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM email_audit_logs WHERE recipient LIKE \'%test%\'');
    await db.end();

    // Restore environment
    process.env = originalEnv;
  });

  afterEach(async () => {
    // Clean up test data after each test
    await db.query('DELETE FROM email_audit_logs WHERE recipient LIKE \'%test%\'');
  });

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  /**
   * Generate valid Mailgun webhook signature
   */
  function generateSignature(timestamp: string, token: string): string {
    const data = `${timestamp}${token}`;
    const hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(data);
    return hmac.digest('hex');
  }

  /**
   * Event data overrides for customizing test payloads
   */
  interface EventDataOverrides {
    'client-info'?: {
      'client-name': string;
      'client-os': string;
      'device-type': string;
      'user-agent': string;
    };
    geolocation?: {
      country: string;
      region: string;
      city: string;
    };
    url?: string;
    reason?: string;
    error?: string;
    'delivery-status'?: {
      message: string;
      code: number;
    };
  }

  /**
   * Create valid webhook payload
   */
  function createWebhookPayload(
    eventType: string = 'delivered',
    recipient: string = 'test@example.com',
    overrides: EventDataOverrides = {}
  ) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const token = crypto.randomBytes(32).toString('hex');
    const signature = generateSignature(timestamp, token);

    return {
      signature: {
        timestamp,
        token,
        signature,
      },
      'event-data': {
        event: eventType,
        timestamp: parseInt(timestamp),
        recipient,
        message: {
          headers: {
            'message-id': '<test-message-id@example.com>',
            to: recipient,
            from: 'noreply@misjusticealliance.org',
            subject: 'Test Email Subject',
          },
        },
        tags: ['test-tag', 'integration-test'],
        'user-variables': {
          submissionId: 'TEST-2026-001',
        },
        ...overrides,
      },
    };
  }

  // ==========================================================================
  // HEALTH CHECK ENDPOINT
  // ==========================================================================

  describe('GET /api/webhooks/health', () => {
    it('should return 200 OK with healthy status', async () => {
      const response = await request(app)
        .get('/api/webhooks/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        service: 'webhooks',
        status: 'healthy',
        timestamp: expect.any(String),
      });

      // Validate timestamp format
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });
  });

  // ==========================================================================
  // VALID WEBHOOK REQUESTS
  // ==========================================================================

  describe('POST /api/webhooks/mailgun - Valid Requests', () => {
    it('should accept valid webhook with delivered event', async () => {
      const payload = createWebhookPayload('delivered', 'test-delivered@example.com');

      const response = await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Webhook processed successfully',
      });

      // Verify event logged to database
      const result = await db.query(
        'SELECT * FROM email_audit_logs WHERE recipient = $1',
        ['test-delivered@example.com']
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].event_type).toBe('delivered');
      expect(result.rows[0].recipient).toBe('test-delivered@example.com');
      expect(result.rows[0].subject).toBe('Test Email Subject');
      expect(result.rows[0].message_id).toBe('<test-message-id@example.com>');
    });

    it('should accept valid webhook with opened event', async () => {
      const payload = createWebhookPayload('opened', 'test-opened@example.com', {
        'client-info': {
          'client-name': 'Chrome',
          'client-os': 'macOS',
          'device-type': 'desktop',
          'user-agent': 'Mozilla/5.0...',
        },
        geolocation: {
          country: 'US',
          region: 'CA',
          city: 'San Francisco',
        },
      });

      await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(200);

      // Verify client info and geolocation stored
      const result = await db.query(
        'SELECT client_info, geolocation FROM email_audit_logs WHERE recipient = $1',
        ['test-opened@example.com']
      );

      expect(result.rows[0].client_info).toEqual({
        'client-name': 'Chrome',
        'client-os': 'macOS',
        'device-type': 'desktop',
        'user-agent': 'Mozilla/5.0...',
      });

      expect(result.rows[0].geolocation).toEqual({
        country: 'US',
        region: 'CA',
        city: 'San Francisco',
      });
    });

    it('should accept valid webhook with clicked event', async () => {
      const payload = createWebhookPayload('clicked', 'test-clicked@example.com', {
        url: 'https://example.com/case/123',
      });

      await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(200);

      // Verify URL stored
      const result = await db.query(
        'SELECT url_clicked FROM email_audit_logs WHERE recipient = $1',
        ['test-clicked@example.com']
      );

      expect(result.rows[0].url_clicked).toBe('https://example.com/case/123');
    });

    it('should accept valid webhook with bounced event', async () => {
      const payload = createWebhookPayload('bounced', 'test-bounced@example.com', {
        reason: 'hard-bounce',
        error: 'Mailbox does not exist',
      });

      await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(200);

      // Verify reason and error stored
      const result = await db.query(
        'SELECT reason, error_message FROM email_audit_logs WHERE recipient = $1',
        ['test-bounced@example.com']
      );

      expect(result.rows[0].reason).toBe('hard-bounce');
      expect(result.rows[0].error_message).toBe('Mailbox does not exist');
    });

    it('should accept valid webhook with failed event', async () => {
      const payload = createWebhookPayload('failed', 'test-failed@example.com', {
        'delivery-status': {
          message: 'Delivery failed',
          code: 550,
        },
        error: 'SMTP error: 550 Requested action not taken',
      });

      await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(200);

      // Verify delivery status and error stored
      const result = await db.query(
        'SELECT delivery_status, error_message FROM email_audit_logs WHERE recipient = $1',
        ['test-failed@example.com']
      );

      expect(result.rows[0].delivery_status).toEqual({
        message: 'Delivery failed',
        code: 550,
      });

      expect(result.rows[0].error_message).toBe('SMTP error: 550 Requested action not taken');
    });

    it('should accept valid webhook with complained event', async () => {
      const payload = createWebhookPayload('complained', 'test-complained@example.com');

      await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(200);

      // Verify event logged
      const result = await db.query(
        'SELECT event_type FROM email_audit_logs WHERE recipient = $1',
        ['test-complained@example.com']
      );

      expect(result.rows[0].event_type).toBe('complained');
    });

    it('should accept valid webhook with unsubscribed event', async () => {
      const payload = createWebhookPayload('unsubscribed', 'test-unsubscribed@example.com');

      await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(200);

      // Verify event logged
      const result = await db.query(
        'SELECT event_type FROM email_audit_logs WHERE recipient = $1',
        ['test-unsubscribed@example.com']
      );

      expect(result.rows[0].event_type).toBe('unsubscribed');
    });

    it('should store tags and user variables', async () => {
      const payload = createWebhookPayload('delivered', 'test-tags@example.com');

      await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(200);

      // Verify tags and user variables stored
      const result = await db.query(
        'SELECT tags, user_variables FROM email_audit_logs WHERE recipient = $1',
        ['test-tags@example.com']
      );

      expect(result.rows[0].tags).toEqual(['test-tag', 'integration-test']);
      expect(result.rows[0].user_variables).toEqual({
        submissionId: 'TEST-2026-001',
      });
    });
  });

  // ==========================================================================
  // INVALID SIGNATURE
  // ==========================================================================

  describe('POST /api/webhooks/mailgun - Invalid Signature', () => {
    it('should reject webhook with invalid signature', async () => {
      const payload = createWebhookPayload('delivered', 'test@example.com');

      // Tamper with signature
      payload.signature.signature = 'invalid-signature-12345';

      const response = await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Unauthorized - invalid signature',
      });

      // Verify event NOT logged to database
      const result = await db.query(
        'SELECT * FROM email_audit_logs WHERE recipient = $1',
        ['test@example.com']
      );

      expect(result.rows).toHaveLength(0);
    });

    it('should reject webhook with wrong signing key', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const token = crypto.randomBytes(32).toString('hex');

      // Generate signature with wrong key
      const data = `${timestamp}${token}`;
      const hmac = crypto.createHmac('sha256', 'wrong-key');
      hmac.update(data);
      const wrongSignature = hmac.digest('hex');

      const payload = {
        signature: {
          timestamp,
          token,
          signature: wrongSignature,
        },
        'event-data': {
          event: 'delivered',
          timestamp: parseInt(timestamp),
          recipient: 'test@example.com',
          message: {
            headers: {
              'message-id': '<test@example.com>',
              to: 'test@example.com',
              from: 'noreply@test.com',
              subject: 'Test',
            },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(401);
    });
  });

  // ==========================================================================
  // TIMESTAMP VALIDATION (REPLAY ATTACK PREVENTION)
  // ==========================================================================

  describe('POST /api/webhooks/mailgun - Timestamp Validation', () => {
    it('should reject webhook with expired timestamp (>15 minutes old)', async () => {
      // Create timestamp from 20 minutes ago
      const oldTimestamp = Math.floor((Date.now() - 20 * 60 * 1000) / 1000).toString();
      const token = crypto.randomBytes(32).toString('hex');
      const signature = generateSignature(oldTimestamp, token);

      const payload = {
        signature: {
          timestamp: oldTimestamp,
          token,
          signature,
        },
        'event-data': {
          event: 'delivered',
          timestamp: parseInt(oldTimestamp),
          recipient: 'test-expired@example.com',
          message: {
            headers: {
              'message-id': '<test@example.com>',
              to: 'test@example.com',
              from: 'noreply@test.com',
              subject: 'Test',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Webhook timestamp expired',
      });

      // Verify event NOT logged
      const result = await db.query(
        'SELECT * FROM email_audit_logs WHERE recipient = $1',
        ['test-expired@example.com']
      );

      expect(result.rows).toHaveLength(0);
    });

    it('should accept webhook with recent timestamp (within 15 minutes)', async () => {
      // Create timestamp from 10 minutes ago
      const recentTimestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000).toString();
      const token = crypto.randomBytes(32).toString('hex');
      const signature = generateSignature(recentTimestamp, token);

      const payload = {
        signature: {
          timestamp: recentTimestamp,
          token,
          signature,
        },
        'event-data': {
          event: 'delivered',
          timestamp: parseInt(recentTimestamp),
          recipient: 'test-recent@example.com',
          message: {
            headers: {
              'message-id': '<test@example.com>',
              to: 'test@example.com',
              from: 'noreply@test.com',
              subject: 'Test',
            },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(200);

      // Verify event logged
      const result = await db.query(
        'SELECT * FROM email_audit_logs WHERE recipient = $1',
        ['test-recent@example.com']
      );

      expect(result.rows).toHaveLength(1);
    });
  });

  // ==========================================================================
  // INVALID PAYLOAD STRUCTURE
  // ==========================================================================

  describe('POST /api/webhooks/mailgun - Invalid Payload', () => {
    it('should reject webhook with missing signature', async () => {
      const payload = {
        'event-data': {
          event: 'delivered',
          timestamp: Math.floor(Date.now() / 1000),
          recipient: 'test@example.com',
          message: {
            headers: {
              'message-id': '<test@example.com>',
              to: 'test@example.com',
              from: 'noreply@test.com',
              subject: 'Test',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid payload structure',
      });
    });

    it('should reject webhook with missing event-data', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const token = crypto.randomBytes(32).toString('hex');
      const signature = generateSignature(timestamp, token);

      const payload = {
        signature: {
          timestamp,
          token,
          signature,
        },
      };

      const response = await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid payload structure',
      });
    });
  });

  // ==========================================================================
  // DATABASE ERROR HANDLING
  // ==========================================================================

  describe('POST /api/webhooks/mailgun - Error Handling', () => {
    it('should return 200 OK even if database logging fails', async () => {
      // This test verifies that Mailgun doesn't retry on database errors
      // The webhook implementation intentionally swallows database errors
      const payload = createWebhookPayload('delivered', 'test-db-error@example.com');

      // Mock database query to fail
      const originalQuery = db.query;
      db.query = jest.fn().mockRejectedValueOnce(new Error('Database connection error'));

      const response = await request(app)
        .post('/api/webhooks/mailgun')
        .send(payload)
        .expect(200);

      // Should still return success to prevent Mailgun retries
      // Database errors are logged but don't fail the webhook
      expect(response.body).toEqual({
        success: true,
        message: 'Webhook processed successfully',
      });

      // Restore original query method
      db.query = originalQuery;
    });
  });
});
