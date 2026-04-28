-- ============================================================================
-- Migration: 005_create_migration_tracking.sql
-- Purpose: Create migration tracking infrastructure for automated deployment
-- Author: MISJustice Alliance Development Team
-- Date: 2026-01-02
-- Version: 1.0.0
-- ============================================================================

-- ============================================================================
-- Table: schema_migrations
-- Purpose: Track which migrations have been applied to the database
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  -- Primary identifier
  id SERIAL PRIMARY KEY,

  -- Migration identification
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  migration_version INTEGER NOT NULL,

  -- Execution tracking
  applied_at TIMESTAMP DEFAULT NOW() NOT NULL,
  execution_time_ms INTEGER, -- Time taken to execute migration (milliseconds)

  -- Migration metadata
  description TEXT,
  applied_by VARCHAR(255), -- User/system that applied migration
  checksum VARCHAR(64),     -- SHA-256 hash of migration file for verification

  -- Rollback tracking
  rolled_back BOOLEAN DEFAULT FALSE,
  rolled_back_at TIMESTAMP,
  rollback_reason TEXT
);

-- Add comments
COMMENT ON TABLE schema_migrations IS 'Track applied database migrations for version control and deployment automation';
COMMENT ON COLUMN schema_migrations.migration_name IS 'Filename of migration (e.g., 001_create_legal_cases.sql)';
COMMENT ON COLUMN schema_migrations.migration_version IS 'Migration version number for ordering (extracted from filename)';
COMMENT ON COLUMN schema_migrations.checksum IS 'SHA-256 hash of migration file to detect unauthorized changes';
COMMENT ON COLUMN schema_migrations.rolled_back IS 'Whether this migration has been rolled back';

-- ============================================================================
-- Indexes for migration tracking
-- ============================================================================

-- Quick lookup of migration status
CREATE INDEX IF NOT EXISTS idx_schema_migrations_name ON schema_migrations(migration_name);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(migration_version);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at DESC);

-- Filter rolled back migrations
CREATE INDEX IF NOT EXISTS idx_schema_migrations_rolled_back ON schema_migrations(rolled_back);

-- ============================================================================
-- Insert existing migrations (retroactive tracking)
-- ============================================================================
-- Purpose: Record previously applied migrations for complete history

INSERT INTO schema_migrations (
  migration_name,
  migration_version,
  applied_at,
  description,
  applied_by,
  rolled_back
) VALUES
  ('001_create_legal_cases.sql', 1, NOW() - INTERVAL '2 days', 'Create legal case management schema', 'system', FALSE),
  ('002_create_users.sql', 2, NOW() - INTERVAL '2 days', 'Create users table with RBAC support', 'system', FALSE),
  ('003_create_email_audit_logs.sql', 3, NOW() - INTERVAL '1 day', 'Create email audit logging table', 'system', FALSE),
  ('004_add_performance_indexes.sql', 4, NOW() - INTERVAL '1 hour', 'Add composite indexes and query optimizations', 'system', FALSE),
  ('005_create_migration_tracking.sql', 5, NOW(), 'Create migration tracking infrastructure', 'system', FALSE)
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================================
-- View: migration_status
-- Purpose: Human-readable view of migration history
-- ============================================================================

CREATE OR REPLACE VIEW migration_status AS
SELECT
  migration_version AS version,
  migration_name AS name,
  description,
  applied_at,
  CASE
    WHEN execution_time_ms IS NULL THEN 'N/A'
    WHEN execution_time_ms < 1000 THEN execution_time_ms || 'ms'
    ELSE ROUND(execution_time_ms / 1000.0, 2) || 's'
  END AS execution_time,
  applied_by,
  CASE
    WHEN rolled_back THEN 'ROLLED BACK'
    ELSE 'APPLIED'
  END AS status,
  rolled_back_at,
  rollback_reason
FROM schema_migrations
ORDER BY migration_version DESC;

COMMENT ON VIEW migration_status IS 'Human-readable migration history with status and execution time';

-- ============================================================================
-- Function: record_migration
-- Purpose: Helper function to record migration execution
-- ============================================================================

CREATE OR REPLACE FUNCTION record_migration(
  p_migration_name VARCHAR,
  p_version INTEGER,
  p_description TEXT,
  p_execution_time_ms INTEGER DEFAULT NULL,
  p_checksum VARCHAR DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO schema_migrations (
    migration_name,
    migration_version,
    applied_at,
    execution_time_ms,
    description,
    applied_by,
    checksum,
    rolled_back
  ) VALUES (
    p_migration_name,
    p_version,
    NOW(),
    p_execution_time_ms,
    p_description,
    CURRENT_USER,
    p_checksum,
    FALSE
  )
  ON CONFLICT (migration_name) DO NOTHING;

  RAISE NOTICE 'Migration % (v%) applied successfully', p_migration_name, p_version;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_migration IS 'Record successful migration execution with metadata';

-- ============================================================================
-- Function: rollback_migration
-- Purpose: Mark migration as rolled back
-- ============================================================================

CREATE OR REPLACE FUNCTION rollback_migration(
  p_migration_name VARCHAR,
  p_rollback_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE schema_migrations
  SET
    rolled_back = TRUE,
    rolled_back_at = NOW(),
    rollback_reason = COALESCE(p_rollback_reason, 'Manual rollback')
  WHERE migration_name = p_migration_name
    AND rolled_back = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Migration % not found or already rolled back', p_migration_name;
  END IF;

  RAISE NOTICE 'Migration % rolled back: %', p_migration_name, COALESCE(p_rollback_reason, 'No reason provided');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rollback_migration IS 'Mark migration as rolled back with reason';

-- ============================================================================
-- Function: get_pending_migrations
-- Purpose: Helper to identify which migrations need to be applied
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_migrations()
RETURNS TABLE (
  migration_file VARCHAR
) AS $$
BEGIN
  -- This is a placeholder function for migration management
  -- In practice, this would compare filesystem migrations against schema_migrations table

  RETURN QUERY
  SELECT 'No pending migrations detected (placeholder function)'::VARCHAR;

  RAISE NOTICE 'Use external migration runner to detect pending migrations';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pending_migrations IS 'Identify migrations not yet applied (placeholder for migration runner)';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Show all applied migrations
SELECT * FROM migration_status;

-- Count migrations
SELECT
  COUNT(*) AS total_migrations,
  COUNT(*) FILTER (WHERE rolled_back = FALSE) AS active_migrations,
  COUNT(*) FILTER (WHERE rolled_back = TRUE) AS rolled_back_migrations
FROM schema_migrations;

-- Show latest migration
SELECT
  migration_name,
  migration_version,
  applied_at
FROM schema_migrations
WHERE rolled_back = FALSE
ORDER BY migration_version DESC
LIMIT 1;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Migration tracking table created: schema_migrations
-- 2. Existing migrations retroactively recorded
-- 3. Helper functions for recording and rolling back migrations
-- 4. Migration status view for human-readable history
-- 5. Use record_migration() function in new migrations
-- 6. Integration with migration runner (e.g., db-migrate, flyway) recommended
-- ============================================================================

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================
-- Purpose: Undo this migration if needed

/*
-- Drop functions
DROP FUNCTION IF EXISTS get_pending_migrations();
DROP FUNCTION IF EXISTS rollback_migration(VARCHAR, TEXT);
DROP FUNCTION IF EXISTS record_migration(VARCHAR, INTEGER, TEXT, INTEGER, VARCHAR);

-- Drop view
DROP VIEW IF EXISTS migration_status;

-- Drop table
DROP TABLE IF EXISTS schema_migrations CASCADE;

SELECT 'Migration 005 rolled back successfully' AS status;
*/

-- ============================================================================
-- End of Migration
-- ============================================================================
