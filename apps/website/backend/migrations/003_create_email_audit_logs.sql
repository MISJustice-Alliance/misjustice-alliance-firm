-- ============================================================================
-- Migration: 003_create_email_audit_logs.sql
-- Purpose: Create email audit logging table for Mailgun webhook events
-- Author: Phase 1 Implementation - Email Service Integration
-- Date: 2026-01-02
-- Version: 1.0.0
-- Architecture: See ARCHITECTURE.md Section 9 (Email Service - Mailgun)
-- ============================================================================

-- ============================================================================
-- Table: email_audit_logs
-- Purpose: Store email delivery events and tracking data from Mailgun webhooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_audit_logs (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email event details
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'accepted',         -- Email accepted by Mailgun
    'delivered',        -- Email successfully delivered to recipient
    'opened',           -- Email opened by recipient (tracking pixel)
    'clicked',          -- Link clicked in email
    'bounced',          -- Email bounced (hard/soft bounce)
    'failed',           -- Email delivery failed
    'complained',       -- Recipient marked email as spam
    'unsubscribed',     -- Recipient unsubscribed
    'stored'            -- Email stored in Mailgun
  )),

  -- Recipient information
  recipient VARCHAR(255) NOT NULL, -- Email address of recipient
  subject VARCHAR(500),            -- Email subject line
  message_id VARCHAR(255),         -- Mailgun message ID

  -- Event metadata
  timestamp TIMESTAMP NOT NULL,    -- When event occurred
  tags JSONB,                      -- Mailgun tags array (e.g., ['case-submission', 'confirmation'])
  user_variables JSONB,            -- Custom variables passed to template

  -- Engagement tracking (for 'opened' and 'clicked' events)
  client_info JSONB,               -- Browser/device information
  geolocation JSONB,               -- Geographic location of recipient

  -- Delivery tracking
  delivery_status JSONB,           -- Delivery status message and code
  url_clicked TEXT,                -- URL clicked (for 'clicked' events)

  -- Error tracking (for 'bounced' and 'failed' events)
  reason TEXT,                     -- Bounce/failure reason
  error_message TEXT,              -- Detailed error message

  -- Raw event data (for debugging and compliance)
  raw_event_data JSONB NOT NULL,   -- Complete webhook payload

  -- Audit timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE email_audit_logs IS 'Email delivery events and tracking data from Mailgun webhooks for compliance and analytics';
COMMENT ON COLUMN email_audit_logs.event_type IS 'Type of email event (delivered, opened, clicked, bounced, failed, etc.)';
COMMENT ON COLUMN email_audit_logs.tags IS 'Mailgun tags for categorizing emails (JSON array)';
COMMENT ON COLUMN email_audit_logs.user_variables IS 'Custom template variables (e.g., submission ID, case number) as JSON object';
COMMENT ON COLUMN email_audit_logs.raw_event_data IS 'Complete Mailgun webhook payload for debugging and audit compliance';

-- ============================================================================
-- Indexes for performance optimization
-- ============================================================================

-- Query by recipient email
CREATE INDEX IF NOT EXISTS idx_email_audit_logs_recipient ON email_audit_logs(recipient);

-- Query by event type
CREATE INDEX IF NOT EXISTS idx_email_audit_logs_event_type ON email_audit_logs(event_type);

-- Query by timestamp (for time-based analytics)
CREATE INDEX IF NOT EXISTS idx_email_audit_logs_timestamp ON email_audit_logs(timestamp DESC);

-- Query by message ID (track all events for specific email)
CREATE INDEX IF NOT EXISTS idx_email_audit_logs_message_id ON email_audit_logs(message_id);

-- Composite index for common queries (recipient + event type)
CREATE INDEX IF NOT EXISTS idx_email_audit_logs_recipient_event ON email_audit_logs(recipient, event_type);

-- GIN index for JSONB columns (for filtering by tags or user variables)
CREATE INDEX IF NOT EXISTS idx_email_audit_logs_tags ON email_audit_logs USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_email_audit_logs_user_variables ON email_audit_logs USING GIN (user_variables);

-- ============================================================================
-- Email delivery statistics view
-- Purpose: Aggregate email metrics for analytics dashboard
-- ============================================================================

CREATE OR REPLACE VIEW email_delivery_stats AS
SELECT
  DATE_TRUNC('day', timestamp) AS date,
  event_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT recipient) AS unique_recipients,
  COUNT(DISTINCT message_id) AS unique_messages
FROM email_audit_logs
GROUP BY DATE_TRUNC('day', timestamp), event_type
ORDER BY date DESC, event_type;

COMMENT ON VIEW email_delivery_stats IS 'Aggregated email delivery statistics grouped by date and event type';

-- ============================================================================
-- Email engagement metrics view
-- Purpose: Calculate email engagement rates (open rate, click rate, etc.)
-- ============================================================================

CREATE OR REPLACE VIEW email_engagement_metrics AS
WITH delivery_counts AS (
  SELECT
    DATE_TRUNC('day', timestamp) AS date,
    COUNT(*) FILTER (WHERE event_type = 'delivered') AS delivered,
    COUNT(*) FILTER (WHERE event_type = 'opened') AS opened,
    COUNT(*) FILTER (WHERE event_type = 'clicked') AS clicked,
    COUNT(*) FILTER (WHERE event_type = 'bounced') AS bounced,
    COUNT(*) FILTER (WHERE event_type = 'failed') AS failed,
    COUNT(*) FILTER (WHERE event_type = 'complained') AS complained
  FROM email_audit_logs
  GROUP BY DATE_TRUNC('day', timestamp)
)
SELECT
  date,
  delivered,
  opened,
  clicked,
  bounced,
  failed,
  complained,
  -- Calculate engagement rates
  CASE WHEN delivered > 0 THEN ROUND((opened::NUMERIC / delivered * 100), 2) ELSE 0 END AS open_rate_pct,
  CASE WHEN delivered > 0 THEN ROUND((clicked::NUMERIC / delivered * 100), 2) ELSE 0 END AS click_rate_pct,
  CASE WHEN delivered > 0 THEN ROUND((bounced::NUMERIC / delivered * 100), 2) ELSE 0 END AS bounce_rate_pct,
  CASE WHEN delivered > 0 THEN ROUND((complained::NUMERIC / delivered * 100), 2) ELSE 0 END AS complaint_rate_pct
FROM delivery_counts
ORDER BY date DESC;

COMMENT ON VIEW email_engagement_metrics IS 'Email engagement metrics with open rate, click rate, bounce rate, and complaint rate calculations';

-- ============================================================================
-- Data retention policy (optional - for GDPR compliance)
-- Purpose: Automatically delete old email audit logs after retention period
-- ============================================================================

-- Create function to delete old email audit logs (older than 1 year)
CREATE OR REPLACE FUNCTION delete_old_email_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM email_audit_logs
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_old_email_audit_logs() IS 'Delete email audit logs older than 1 year for GDPR compliance and data retention policy';

-- Create scheduled job to run cleanup (requires pg_cron extension)
-- Uncomment if pg_cron is installed:
-- SELECT cron.schedule('cleanup-email-logs', '0 2 * * 0', 'SELECT delete_old_email_audit_logs()');

-- ============================================================================
-- Sample queries for common use cases
-- ============================================================================

-- Query: Get recent email delivery failures
-- SELECT * FROM email_audit_logs
-- WHERE event_type IN ('bounced', 'failed')
-- ORDER BY timestamp DESC
-- LIMIT 100;

-- Query: Get email engagement for specific recipient
-- SELECT
--   recipient,
--   event_type,
--   timestamp,
--   subject
-- FROM email_audit_logs
-- WHERE recipient = 'user@example.com'
-- ORDER BY timestamp DESC;

-- Query: Get daily email delivery statistics
-- SELECT * FROM email_delivery_stats
-- WHERE date >= NOW() - INTERVAL '30 days';

-- Query: Get email engagement metrics for last month
-- SELECT * FROM email_engagement_metrics
-- WHERE date >= NOW() - INTERVAL '30 days';

-- Query: Find emails that were delivered but never opened (follow-up candidates)
-- SELECT DISTINCT message_id, recipient, subject, timestamp
-- FROM email_audit_logs
-- WHERE event_type = 'delivered'
--   AND message_id NOT IN (
--     SELECT message_id FROM email_audit_logs WHERE event_type = 'opened'
--   )
--   AND timestamp >= NOW() - INTERVAL '7 days'
-- ORDER BY timestamp DESC;
