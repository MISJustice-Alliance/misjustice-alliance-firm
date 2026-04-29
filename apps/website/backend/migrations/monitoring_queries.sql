-- ============================================================================
-- Database Monitoring Queries
-- Purpose: Production-ready queries for monitoring database health and performance
-- Author: MISJustice Alliance Development Team
-- Date: 2026-01-02
-- Usage: Run these queries manually or integrate with monitoring tools
-- ============================================================================

-- ============================================================================
-- CONNECTION POOL MONITORING
-- ============================================================================

-- View: Connection pool statistics
CREATE OR REPLACE VIEW connection_pool_stats AS
SELECT
  datname AS database,
  numbackends AS active_connections,
  pg_size_pretty(pg_database_size(datname)) AS database_size,
  (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections') AS max_connections,
  ROUND((numbackends::NUMERIC / (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections') * 100), 2) AS connection_usage_pct
FROM pg_stat_database
WHERE datname = current_database();

COMMENT ON VIEW connection_pool_stats IS 'Monitor connection pool usage and database size';

-- Query: Active connections by state
SELECT
  state,
  COUNT(*) AS connection_count,
  ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - state_change)))::NUMERIC, 2) AS avg_state_duration_sec
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY connection_count DESC;

-- Query: Long-running queries (>5 seconds)
SELECT
  pid,
  usename AS username,
  application_name,
  client_addr AS client_ip,
  state,
  EXTRACT(EPOCH FROM (NOW() - query_start))::INTEGER AS duration_sec,
  LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE datname = current_database()
  AND state != 'idle'
  AND query_start < NOW() - INTERVAL '5 seconds'
ORDER BY duration_sec DESC;

-- Query: Blocked queries (waiting for locks)
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_query,
  blocking_activity.query AS blocking_query,
  EXTRACT(EPOCH FROM (NOW() - blocked_activity.query_start))::INTEGER AS blocked_duration_sec
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- ============================================================================
-- QUERY PERFORMANCE MONITORING
-- ============================================================================

-- Enable pg_stat_statements extension for query performance tracking
-- Note: This extension requires shared_preload_libraries configuration in postgresql.conf
-- If not available, slow query monitoring will be unavailable (view creation skipped below)
-- To enable: Add "shared_preload_libraries = 'pg_stat_statements'" to postgresql.conf and restart
-- Then run: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- For now, we skip extension creation entirely and only create view if extension already exists

-- View: Slow query statistics (requires pg_stat_statements extension)
-- Only created if pg_stat_statements extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW slow_query_stats AS
      SELECT
        LEFT(query, 100) AS query_preview,
        calls AS execution_count,
        ROUND(total_exec_time::NUMERIC, 2) AS total_time_ms,
        ROUND(mean_exec_time::NUMERIC, 2) AS avg_time_ms,
        ROUND(max_exec_time::NUMERIC, 2) AS max_time_ms,
        ROUND((stddev_exec_time / NULLIF(mean_exec_time, 0) * 100)::NUMERIC, 2) AS variance_pct,
        rows AS total_rows_returned
      FROM pg_stat_statements
      WHERE query NOT LIKE ''%pg_stat_statements%''
        AND query NOT LIKE ''%pg_catalog%''
      ORDER BY mean_exec_time DESC
      LIMIT 50
    ';

    COMMENT ON VIEW slow_query_stats IS 'Top 50 slowest queries by average execution time (requires pg_stat_statements)';
  ELSE
    RAISE NOTICE 'Skipping slow_query_stats view creation (pg_stat_statements extension not available)';
  END IF;
END
$$;

-- ============================================================================
-- TABLE AND INDEX HEALTH
-- ============================================================================

-- View: Table size and row count
CREATE OR REPLACE VIEW table_size_stats AS
SELECT
  schemaname,
  relname AS tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname) - pg_relation_size(schemaname||'.'||relname)) AS indexes_size,
  n_live_tup AS row_count,
  n_dead_tup AS dead_rows,
  CASE
    WHEN n_live_tup > 0 THEN ROUND((n_dead_tup::NUMERIC / n_live_tup * 100), 2)
    ELSE 0
  END AS dead_row_pct
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;

COMMENT ON VIEW table_size_stats IS 'Table sizes, row counts, and dead tuple percentages';

-- View: Unused or rarely-used indexes
CREATE OR REPLACE VIEW unused_index_stats AS
SELECT
  schemaname,
  relname AS tablename,
  indexrelname AS indexname,
  idx_scan AS scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  CASE
    WHEN idx_scan = 0 THEN 'NEVER USED'
    WHEN idx_scan < 10 THEN 'RARELY USED'
    ELSE 'OK'
  END AS usage_status
FROM pg_stat_user_indexes
WHERE idx_scan < 100  -- Adjust threshold based on workload
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

COMMENT ON VIEW unused_index_stats IS 'Identify unused or rarely-used indexes for potential removal';

-- ============================================================================
-- CACHE HIT RATIO
-- ============================================================================

-- View: Buffer cache hit ratio (should be >99%)
CREATE OR REPLACE VIEW cache_hit_ratio AS
SELECT
  'Buffer Cache' AS cache_type,
  SUM(heap_blks_read) AS disk_reads,
  SUM(heap_blks_hit) AS cache_hits,
  ROUND((SUM(heap_blks_hit)::NUMERIC / NULLIF((SUM(heap_blks_hit) + SUM(heap_blks_read)), 0) * 100), 2) AS hit_ratio_pct
FROM pg_statio_user_tables
UNION ALL
SELECT
  'Index Cache' AS cache_type,
  SUM(idx_blks_read) AS disk_reads,
  SUM(idx_blks_hit) AS cache_hits,
  ROUND((SUM(idx_blks_hit)::NUMERIC / NULLIF((SUM(idx_blks_hit) + SUM(idx_blks_read)), 0) * 100), 2) AS hit_ratio_pct
FROM pg_statio_user_indexes;

COMMENT ON VIEW cache_hit_ratio IS 'Buffer cache hit ratio (target >99%)';

-- ============================================================================
-- REPLICATION AND BACKUP STATUS
-- ============================================================================

-- Query: Replication lag (if using read replicas)
SELECT
  client_addr AS replica_ip,
  state,
  sync_state,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn)) AS send_lag,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS replay_lag,
  EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp()))::INTEGER AS lag_sec
FROM pg_stat_replication;

-- ============================================================================
-- VACUUM AND AUTOVACUUM STATUS
-- ============================================================================

-- View: Autovacuum activity
CREATE OR REPLACE VIEW autovacuum_stats AS
SELECT
  schemaname,
  relname AS tablename,
  last_vacuum,
  last_autovacuum,
  vacuum_count,
  autovacuum_count,
  CASE
    WHEN last_autovacuum IS NULL THEN 'NEVER'
    WHEN last_autovacuum < NOW() - INTERVAL '7 days' THEN 'OVERDUE'
    WHEN last_autovacuum < NOW() - INTERVAL '3 days' THEN 'WARNING'
    ELSE 'OK'
  END AS vacuum_status
FROM pg_stat_user_tables
ORDER BY last_autovacuum ASC NULLS FIRST;

COMMENT ON VIEW autovacuum_stats IS 'Track vacuum and autovacuum activity';

-- ============================================================================
-- HEALTH CHECK SUMMARY
-- ============================================================================

-- View: Overall database health summary
CREATE OR REPLACE VIEW database_health_summary AS
SELECT
  'Database Size' AS metric,
  pg_size_pretty(pg_database_size(current_database())) AS value,
  NULL AS threshold,
  'INFO' AS status
UNION ALL
SELECT
  'Active Connections' AS metric,
  (SELECT COUNT(*)::TEXT FROM pg_stat_activity WHERE state != 'idle') AS value,
  '< 80% of max_connections' AS threshold,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_stat_activity WHERE state != 'idle') > (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections') * 0.8
    THEN 'WARNING'
    ELSE 'OK'
  END AS status
UNION ALL
SELECT
  'Cache Hit Ratio' AS metric,
  (SELECT ROUND(hit_ratio_pct, 2)::TEXT || '%' FROM cache_hit_ratio WHERE cache_type = 'Buffer Cache') AS value,
  '> 99%' AS threshold,
  CASE
    WHEN (SELECT hit_ratio_pct FROM cache_hit_ratio WHERE cache_type = 'Buffer Cache') < 99
    THEN 'WARNING'
    ELSE 'OK'
  END AS status
UNION ALL
SELECT
  'Long-Running Queries' AS metric,
  (SELECT COUNT(*)::TEXT FROM pg_stat_activity WHERE state != 'idle' AND query_start < NOW() - INTERVAL '30 seconds') AS value,
  '< 5 queries' AS threshold,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_stat_activity WHERE state != 'idle' AND query_start < NOW() - INTERVAL '30 seconds') > 5
    THEN 'WARNING'
    ELSE 'OK'
  END AS status
UNION ALL
SELECT
  'Dead Tuples' AS metric,
  (SELECT MAX(dead_row_pct)::TEXT || '%' FROM table_size_stats) AS value,
  '< 10%' AS threshold,
  CASE
    WHEN (SELECT MAX(dead_row_pct) FROM table_size_stats) > 10
    THEN 'WARNING'
    ELSE 'OK'
  END AS status;

COMMENT ON VIEW database_health_summary IS 'Overall database health check with thresholds and status';

-- ============================================================================
-- MAINTENANCE RECOMMENDATIONS
-- ============================================================================

-- Generate maintenance recommendations
CREATE OR REPLACE FUNCTION get_maintenance_recommendations()
RETURNS TABLE (
  priority VARCHAR,
  action VARCHAR,
  reason TEXT
) AS $$
BEGIN
  -- High priority: Tables with >10% dead tuples
  RETURN QUERY
  SELECT
    'HIGH'::VARCHAR AS priority,
    'VACUUM ' || tablename AS action,
    'Table has ' || dead_row_pct::TEXT || '% dead tuples' AS reason
  FROM table_size_stats
  WHERE dead_row_pct > 10
  ORDER BY dead_row_pct DESC;

  -- Medium priority: Unused indexes
  RETURN QUERY
  SELECT
    'MEDIUM'::VARCHAR AS priority,
    'DROP INDEX ' || indexname AS action,
    'Index never used, wasting ' || index_size::TEXT || ' storage' AS reason
  FROM unused_index_stats
  WHERE usage_status = 'NEVER USED';

  -- Low priority: Tables not vacuumed in 7 days
  RETURN QUERY
  SELECT
    'LOW'::VARCHAR AS priority,
    'VACUUM ANALYZE ' || tablename AS action,
    'Last autovacuum: ' || COALESCE(last_autovacuum::TEXT, 'never') AS reason
  FROM autovacuum_stats
  WHERE vacuum_status IN ('OVERDUE', 'NEVER');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_maintenance_recommendations IS 'Generate prioritized database maintenance recommendations';

-- ============================================================================
-- End of Monitoring Queries
-- ============================================================================
