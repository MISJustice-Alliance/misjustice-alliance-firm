-- ============================================================================
-- Migration: 004_add_performance_indexes.sql
-- Purpose: Add composite indexes and query optimizations for production scale
-- Author: MISJustice Alliance Development Team
-- Date: 2026-01-02
-- Version: 1.0.0
-- ============================================================================

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================
-- Purpose: Optimize queries that filter on multiple columns simultaneously
-- Rationale: Single-column indexes are inefficient for multi-column filters

-- Case search by status + jurisdiction (common filter combination)
-- Query: SELECT * FROM legal_cases WHERE status = 'intake' AND jurisdiction = 'U.S. District Court'
CREATE INDEX IF NOT EXISTS idx_legal_cases_status_jurisdiction
  ON legal_cases(status, jurisdiction);

-- Case search by status + created_at (e.g., "recent open cases")
-- Query: SELECT * FROM legal_cases WHERE status = 'intake' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_legal_cases_status_created_at
  ON legal_cases(status, created_at DESC);

-- Case documents by case_id + type (common pattern in document listing)
-- Query: SELECT * FROM case_documents WHERE case_id = ? AND document_type = 'complaint'
CREATE INDEX IF NOT EXISTS idx_case_documents_case_id_type
  ON case_documents(case_id, document_type);

-- User lookup by role + account_status (e.g., "active admins")
-- Query: SELECT * FROM users WHERE role = 'admin' AND account_status = 'active'
CREATE INDEX IF NOT EXISTS idx_users_role_status
  ON users(role, account_status);

-- Refresh tokens by user + expiration (cleanup expired tokens per user)
-- Query: SELECT * FROM refresh_tokens WHERE user_id = ? AND expires_at > NOW() AND revoked = FALSE
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_expires_revoked
  ON refresh_tokens(user_id, expires_at, revoked);

-- ============================================================================
-- PARTIAL INDEXES FOR EFFICIENCY
-- ============================================================================
-- Purpose: Index only relevant rows to reduce index size and improve performance

-- Active users only (most queries filter out suspended/deactivated users)
-- Saves space by not indexing inactive accounts
CREATE INDEX IF NOT EXISTS idx_users_active_email
  ON users(email) WHERE account_status = 'active';

-- Non-revoked refresh tokens only (revoked tokens are rarely queried)
-- Note: expires_at comparison done at query time, not in index
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active
  ON refresh_tokens(user_id, expires_at)
  WHERE revoked = FALSE;

-- Locked accounts only (rare case, small index)
-- Note: locked_until expiration check done at query time, not in index
CREATE INDEX IF NOT EXISTS idx_users_locked
  ON users(id, locked_until)
  WHERE locked_until IS NOT NULL;

-- ============================================================================
-- FULL-TEXT SEARCH OPTIMIZATION
-- ============================================================================
-- Purpose: Improve case search performance with better text search indexes

-- Enable pg_trgm extension FIRST (required for gin_trgm_ops operator class)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add full-text search on plaintiff + defendant (common search terms)
-- Query: SELECT * FROM legal_cases WHERE to_tsvector('english', plaintiff || ' ' || defendant) @@ to_tsquery('police')
CREATE INDEX IF NOT EXISTS idx_legal_cases_parties_search
  ON legal_cases USING GIN (to_tsvector('english', plaintiff || ' ' || defendant));

-- Add full-text search on case_number (for case ID lookup)
-- Supports prefix matching: "DOE-2024*"
-- Requires pg_trgm extension (enabled above)
CREATE INDEX IF NOT EXISTS idx_legal_cases_case_number_trgm
  ON legal_cases USING GIN (case_number gin_trgm_ops);

-- ============================================================================
-- JSONB QUERY OPTIMIZATION
-- ============================================================================
-- Purpose: Optimize queries on JSONB columns

-- Index for querying specific Arweave TX IDs within JSONB array
-- Query: SELECT * FROM legal_cases WHERE arweave_tx_ids @> '["txId123"]'::jsonb
CREATE INDEX IF NOT EXISTS idx_legal_cases_arweave_tx_ids
  ON legal_cases USING GIN (arweave_tx_ids);

-- Index for email audit log user variables (custom metadata queries)
-- Already exists in migration 003, but ensuring it's present
CREATE INDEX IF NOT EXISTS idx_email_audit_logs_user_variables
  ON email_audit_logs USING GIN (user_variables);

-- ============================================================================
-- STATISTICS UPDATE
-- ============================================================================
-- Purpose: Update PostgreSQL table statistics for better query planning
-- Note: ANALYZE is safe to run in transactions (unlike VACUUM)

-- ============================================================================
-- QUERY PERFORMANCE MONITORING
-- ============================================================================
-- Purpose: Create view for monitoring slow queries and index usage

-- View: Index usage statistics
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT
  schemaname,
  relname AS tablename,
  indexrelname AS indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

COMMENT ON VIEW index_usage_stats IS 'Index usage statistics for monitoring unused indexes and query optimization';

-- View: Table bloat estimation
CREATE OR REPLACE VIEW table_bloat_stats AS
SELECT
  schemaname,
  relname AS tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname) - pg_relation_size(schemaname||'.'||relname)) AS indexes_size,
  n_live_tup AS live_tuples,
  n_dead_tup AS dead_tuples,
  CASE
    WHEN n_live_tup > 0 THEN ROUND((n_dead_tup::NUMERIC / n_live_tup * 100), 2)
    ELSE 0
  END AS dead_tuple_pct,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

COMMENT ON VIEW table_bloat_stats IS 'Table bloat statistics for monitoring vacuum effectiveness and disk usage';

-- ============================================================================
-- MAINTENANCE - ANALYZE ONLY
-- ============================================================================
-- Purpose: Update table statistics for better query planning
-- Note: VACUUM cannot run inside transaction blocks (migrations run in transactions)
--       Run VACUUM separately via: npm run db:vacuum or manually

-- Update statistics for query planner (safe to run in migrations)
-- This improves query planning immediately after adding indexes

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count new indexes created by this migration
SELECT COUNT(*) AS new_indexes_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND indexname NOT IN (
    -- Indexes from previous migrations
    'idx_legal_cases_status',
    'idx_legal_cases_jurisdiction',
    'idx_legal_cases_filed_date',
    'idx_legal_cases_created_at',
    'idx_legal_cases_facts_search',
    'idx_case_documents_case_id',
    'idx_case_documents_type',
    'idx_case_documents_arweave_tx',
    'idx_case_archives_case_id',
    'idx_case_archives_stage',
    'idx_case_archives_arweave_tx',
    'idx_users_email',
    'idx_users_role',
    'idx_users_account_status',
    'idx_users_email_verification_token',
    'idx_users_reset_token',
    'idx_refresh_tokens_token_hash',
    'idx_refresh_tokens_user_id',
    'idx_refresh_tokens_expires_at',
    'idx_email_audit_logs_recipient',
    'idx_email_audit_logs_event_type',
    'idx_email_audit_logs_timestamp',
    'idx_email_audit_logs_message_id',
    'idx_email_audit_logs_recipient_event',
    'idx_email_audit_logs_tags',
    'idx_email_audit_logs_user_variables'
  );

-- List all indexes in database
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Show total database size
SELECT
  pg_size_pretty(pg_database_size(current_database())) AS database_size;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. New indexes: 12 composite + partial indexes for query optimization
-- 2. Enables pg_trgm extension for fuzzy text search (case number lookup)
-- 3. Creates monitoring views for index usage and table bloat
-- 4. Partial indexes use IMMUTABLE predicates only (no NOW() or CURRENT_TIMESTAMP)
--    Time-based filtering should be done in queries, not index predicates
-- 5. VACUUM not included in migration (cannot run in transaction blocks)
--    Run VACUUM separately: VACUUM ANALYZE <table_name>; or use npm run db:vacuum
-- 6. Monitor index usage via index_usage_stats view
-- 7. Check table bloat via table_bloat_stats view
-- 8. Run VACUUM ANALYZE regularly (daily) to maintain performance
-- ============================================================================

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================
-- Purpose: Undo this migration if needed

/*
-- Drop new indexes
DROP INDEX IF EXISTS idx_legal_cases_status_jurisdiction;
DROP INDEX IF EXISTS idx_legal_cases_status_created_at;
DROP INDEX IF EXISTS idx_case_documents_case_id_type;
DROP INDEX IF EXISTS idx_users_role_status;
DROP INDEX IF EXISTS idx_refresh_tokens_user_expires_revoked;
DROP INDEX IF EXISTS idx_users_active_email;
DROP INDEX IF EXISTS idx_refresh_tokens_active;
DROP INDEX IF EXISTS idx_users_locked;
DROP INDEX IF EXISTS idx_legal_cases_parties_search;
DROP INDEX IF EXISTS idx_legal_cases_case_number_trgm;
DROP INDEX IF EXISTS idx_legal_cases_arweave_tx_ids;

-- Drop views
DROP VIEW IF EXISTS index_usage_stats;
DROP VIEW IF EXISTS table_bloat_stats;

-- Drop extension (only if not used elsewhere)
-- DROP EXTENSION IF EXISTS pg_trgm;

SELECT 'Migration 004 rolled back successfully' AS status;
*/

-- ============================================================================
-- End of Migration
-- ============================================================================
