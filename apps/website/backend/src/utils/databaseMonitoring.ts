/**
 * Database Monitoring Utilities
 * Programmatic access to database health and performance metrics
 */

import { pool } from '../config/database';

/**
 * Health check status levels
 */
export enum HealthStatus {
  OK = 'OK',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
}

/**
 * Database health metric
 */
export interface HealthMetric {
  metric: string;
  value: string;
  threshold: string | null;
  status: HealthStatus;
}

/**
 * Connection pool statistics
 */
export interface ConnectionPoolStats {
  database: string;
  activeConnections: number;
  databaseSize: string;
  maxConnections: number;
  connectionUsagePct: number;
}

/**
 * Cache hit ratio statistics
 */
export interface CacheHitRatio {
  cacheType: string;
  diskReads: number;
  cacheHits: number;
  hitRatioPct: number;
}

/**
 * Slow query information
 */
export interface SlowQuery {
  queryPreview: string;
  executionCount: number;
  totalTimeMs: number;
  avgTimeMs: number;
  maxTimeMs: number;
  variancePct: number;
  totalRowsReturned: number;
}

/**
 * Table bloat statistics
 */
export interface TableBloatStats {
  schemaname: string;
  tablename: string;
  totalSize: string;
  tableSize: string;
  indexesSize: string;
  liveTuples: number;
  deadTuples: number;
  deadTuplePct: number;
  lastVacuum: Date | null;
  lastAutovacuum: Date | null;
}

/**
 * Index usage statistics
 */
export interface IndexUsageStats {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexScans: number;
  tuplesRead: number;
  tuplesFetched: number;
  indexSize: string;
}

/**
 * Maintenance recommendation
 */
export interface MaintenanceRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  reason: string;
}

/**
 * Get overall database health summary
 */
export async function getDatabaseHealth(): Promise<HealthMetric[]> {
  try {
    const result = await pool.query<HealthMetric>(`
      SELECT
        metric,
        value,
        threshold,
        status
      FROM database_health_summary
      ORDER BY
        CASE status
          WHEN 'CRITICAL' THEN 1
          WHEN 'WARNING' THEN 2
          WHEN 'OK' THEN 3
          ELSE 4
        END
    `);

    return result.rows;
  } catch (error) {
    console.error('Failed to get database health:', error);
    return [
      {
        metric: 'Database Health Check',
        value: 'FAILED',
        threshold: null,
        status: HealthStatus.ERROR,
      },
    ];
  }
}

/**
 * Get connection pool statistics
 */
export async function getConnectionPoolStats(): Promise<ConnectionPoolStats | null> {
  try {
    const result = await pool.query<{
      database: string;
      active_connections: number;
      database_size: string;
      max_connections: number;
      connection_usage_pct: number;
    }>(`
      SELECT * FROM connection_pool_stats
    `);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      database: row.database,
      activeConnections: row.active_connections,
      databaseSize: row.database_size,
      maxConnections: row.max_connections,
      connectionUsagePct: row.connection_usage_pct,
    };
  } catch (error) {
    console.error('Failed to get connection pool stats:', error);
    return null;
  }
}

/**
 * Get cache hit ratio
 */
export async function getCacheHitRatio(): Promise<CacheHitRatio[]> {
  try {
    const result = await pool.query<{
      cache_type: string;
      disk_reads: number;
      cache_hits: number;
      hit_ratio_pct: number;
    }>(`
      SELECT * FROM cache_hit_ratio
    `);

    return result.rows.map((row) => ({
      cacheType: row.cache_type,
      diskReads: row.disk_reads,
      cacheHits: row.cache_hits,
      hitRatioPct: row.hit_ratio_pct,
    }));
  } catch (error) {
    console.error('Failed to get cache hit ratio:', error);
    return [];
  }
}

/**
 * Get slow queries (requires pg_stat_statements extension)
 */
export async function getSlowQueries(limit: number = 10): Promise<SlowQuery[]> {
  try {
    const result = await pool.query<{
      query_preview: string;
      execution_count: number;
      total_time_ms: number;
      avg_time_ms: number;
      max_time_ms: number;
      variance_pct: number;
      total_rows_returned: number;
    }>(
      `
      SELECT * FROM slow_query_stats
      LIMIT $1
    `,
      [limit]
    );

    return result.rows.map((row) => ({
      queryPreview: row.query_preview,
      executionCount: row.execution_count,
      totalTimeMs: row.total_time_ms,
      avgTimeMs: row.avg_time_ms,
      maxTimeMs: row.max_time_ms,
      variancePct: row.variance_pct,
      totalRowsReturned: row.total_rows_returned,
    }));
  } catch (error) {
    // pg_stat_statements extension may not be installed
    console.warn('Slow query stats unavailable (pg_stat_statements extension may not be enabled)');
    return [];
  }
}

/**
 * Get table bloat statistics
 */
export async function getTableBloatStats(): Promise<TableBloatStats[]> {
  try {
    const result = await pool.query<{
      schemaname: string;
      tablename: string;
      total_size: string;
      table_size: string;
      indexes_size: string;
      live_tuples: number;
      dead_tuples: number;
      dead_tuple_pct: number;
      last_vacuum: Date | null;
      last_autovacuum: Date | null;
    }>(`
      SELECT * FROM table_bloat_stats
      ORDER BY dead_tuple_pct DESC
      LIMIT 20
    `);

    return result.rows.map((row) => ({
      schemaname: row.schemaname,
      tablename: row.tablename,
      totalSize: row.total_size,
      tableSize: row.table_size,
      indexesSize: row.indexes_size,
      liveTuples: row.live_tuples,
      deadTuples: row.dead_tuples,
      deadTuplePct: row.dead_tuple_pct,
      lastVacuum: row.last_vacuum,
      lastAutovacuum: row.last_autovacuum,
    }));
  } catch (error) {
    console.error('Failed to get table bloat stats:', error);
    return [];
  }
}

/**
 * Get index usage statistics
 */
export async function getIndexUsageStats(): Promise<IndexUsageStats[]> {
  try {
    const result = await pool.query<{
      schemaname: string;
      tablename: string;
      indexname: string;
      index_scans: number;
      tuples_read: number;
      tuples_fetched: number;
      index_size: string;
    }>(`
      SELECT * FROM index_usage_stats
      ORDER BY index_scans ASC
      LIMIT 50
    `);

    return result.rows.map((row) => ({
      schemaname: row.schemaname,
      tablename: row.tablename,
      indexname: row.indexname,
      indexScans: row.index_scans,
      tuplesRead: row.tuples_read,
      tuplesFetched: row.tuples_fetched,
      indexSize: row.index_size,
    }));
  } catch (error) {
    console.error('Failed to get index usage stats:', error);
    return [];
  }
}

/**
 * Get maintenance recommendations
 */
export async function getMaintenanceRecommendations(): Promise<MaintenanceRecommendation[]> {
  try {
    const result = await pool.query<MaintenanceRecommendation>(`
      SELECT * FROM get_maintenance_recommendations()
    `);

    return result.rows;
  } catch (error) {
    console.error('Failed to get maintenance recommendations:', error);
    return [];
  }
}

/**
 * Check if database is healthy (all metrics OK)
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    const health = await getDatabaseHealth();

    // Check if any metric has WARNING or CRITICAL status
    const hasIssues = health.some(
      (metric) => metric.status === HealthStatus.WARNING || metric.status === HealthStatus.CRITICAL
    );

    return !hasIssues;
  } catch (error) {
    console.error('Failed to check database health:', error);
    return false;
  }
}

/**
 * Get long-running queries (currently executing for >5 seconds)
 */
export async function getLongRunningQueries(): Promise<
  {
    pid: number;
    username: string;
    applicationName: string;
    clientIp: string | null;
    state: string;
    durationSec: number;
    queryPreview: string;
  }[]
> {
  try {
    const result = await pool.query<{
      pid: number;
      username: string;
      application_name: string;
      client_ip: string | null;
      state: string;
      duration_sec: number;
      query_preview: string;
    }>(`
      SELECT
        pid,
        usename AS username,
        application_name,
        client_addr::TEXT AS client_ip,
        state,
        EXTRACT(EPOCH FROM (NOW() - query_start))::INTEGER AS duration_sec,
        LEFT(query, 100) AS query_preview
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state != 'idle'
        AND query_start < NOW() - INTERVAL '5 seconds'
      ORDER BY duration_sec DESC
    `);

    return result.rows.map((row) => ({
      pid: row.pid,
      username: row.username,
      applicationName: row.application_name,
      clientIp: row.client_ip,
      state: row.state,
      durationSec: row.duration_sec,
      queryPreview: row.query_preview,
    }));
  } catch (error) {
    console.error('Failed to get long-running queries:', error);
    return [];
  }
}

/**
 * Format database health for logging/display
 */
export function formatHealthSummary(health: HealthMetric[]): string {
  const lines: string[] = ['=== Database Health Summary ==='];

  health.forEach((metric) => {
    const statusSymbol =
      metric.status === HealthStatus.OK
        ? '✅'
        : metric.status === HealthStatus.WARNING
          ? '⚠️'
          : metric.status === HealthStatus.CRITICAL
            ? '❌'
            : '❓';

    const thresholdInfo = metric.threshold ? ` (threshold: ${metric.threshold})` : '';
    lines.push(`${statusSymbol} ${metric.metric}: ${metric.value}${thresholdInfo}`);
  });

  return lines.join('\n');
}

/**
 * Log database health to console
 */
export async function logDatabaseHealth(): Promise<void> {
  const health = await getDatabaseHealth();
  console.log(formatHealthSummary(health));
}

/**
 * Export all monitoring functions
 */
export default {
  getDatabaseHealth,
  getConnectionPoolStats,
  getCacheHitRatio,
  getSlowQueries,
  getTableBloatStats,
  getIndexUsageStats,
  getMaintenanceRecommendations,
  isDatabaseHealthy,
  getLongRunningQueries,
  formatHealthSummary,
  logDatabaseHealth,
};
