/**
 * Database Configuration
 * PostgreSQL connection setup and query helper
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Environment-based configuration
 */
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Slow query threshold (milliseconds)
 * - Production: 200ms (stricter monitoring)
 * - Development: 500ms (more lenient for debugging)
 * - Test: 1000ms (avoid noise from test data)
 */
const SLOW_QUERY_THRESHOLD = isProduction ? 200 : isDevelopment ? 500 : 1000;

/**
 * Database configuration from environment variables
 * Optimized for production scale with proper connection pooling
 */
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'misjustice_dev',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,

  // Connection Pool Settings (optimized for production)
  max: parseInt(process.env.DATABASE_POOL_MAX || '20', 10), // Maximum number of clients in the pool
  min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10), // Minimum number of clients (keep-alive)
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 30000, // Return error after 30 seconds if unable to connect (covers slow initial pool creation)

  // Query Execution Settings
  statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '30000', 10), // 30 second default query timeout

  // Application Name (for pg_stat_activity monitoring)
  application_name: process.env.npm_package_name || 'misjustice-backend',
};

/**
 * PostgreSQL connection pool
 */
export const pool = new Pool(dbConfig);

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connected successfully:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Query execution statistics (in-memory, reset on restart)
 */
export const queryStats = {
  totalQueries: 0,
  slowQueries: 0,
  totalExecutionTime: 0,
  errorCount: 0,
};

/**
 * Execute a query with parameters
 * Uses parameterized queries to prevent SQL injection
 * Includes performance monitoring and statistics tracking
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Update statistics
    queryStats.totalQueries++;
    queryStats.totalExecutionTime += duration;

    // Log slow queries with environment-aware threshold
    if (duration > SLOW_QUERY_THRESHOLD) {
      queryStats.slowQueries++;

      console.warn(
        `⚠️  Slow query (${duration}ms, threshold: ${SLOW_QUERY_THRESHOLD}ms):`,
        text.substring(0, 150),
        params ? `\nParams: ${JSON.stringify(params)}` : ''
      );
    }

    // Log very slow queries (>5 seconds) as errors
    if (duration > 5000) {
      console.error(
        `❌ CRITICAL: Extremely slow query (${duration}ms):`,
        text.substring(0, 200),
        params ? `\nParams: ${JSON.stringify(params)}` : ''
      );
    }

    return result;
  } catch (error) {
    queryStats.errorCount++;

    console.error('❌ Query error:', error);
    console.error('Query:', text.substring(0, 200));
    console.error('Params:', params);

    throw error;
  }
}

/**
 * Get query execution statistics
 */
export function getQueryStats() {
  return {
    ...queryStats,
    averageExecutionTime:
      queryStats.totalQueries > 0
        ? Math.round((queryStats.totalExecutionTime / queryStats.totalQueries) * 100) / 100
        : 0,
    slowQueryPercentage:
      queryStats.totalQueries > 0
        ? Math.round((queryStats.slowQueries / queryStats.totalQueries) * 10000) / 100
        : 0,
  };
}

/**
 * Reset query statistics
 */
export function resetQueryStats() {
  queryStats.totalQueries = 0;
  queryStats.slowQueries = 0;
  queryStats.totalExecutionTime = 0;
  queryStats.errorCount = 0;
}

/**
 * Get a client from the pool for transaction support
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Gracefully close database connections
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('🔌 Database pool closed');
}

/**
 * Connection pool event handlers
 */

// Handle pool errors (critical errors that occur on idle clients)
pool.on('error', (err) => {
  console.error('❌ CRITICAL: Unexpected error on idle database client:', err);
  console.error('This may indicate a network issue or database restart');
  // In production, you might want to notify monitoring systems here
  process.exit(-1);
});

// Log client connections (development only)
if (isDevelopment) {
  pool.on('connect', () => {
    console.log('🔌 New database client connected');
  });

  pool.on('acquire', () => {
    console.log('📦 Client acquired from pool');
  });

  pool.on('remove', () => {
    console.log('🗑️  Client removed from pool');
  });
}

/**
 * Get connection pool statistics
 */
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    utilization:
      pool.totalCount > 0
        ? Math.round(((pool.totalCount - pool.idleCount) / pool.totalCount) * 10000) / 100
        : 0,
  };
}

/**
 * Log pool statistics (useful for debugging connection issues)
 */
export function logPoolStats() {
  const stats = getPoolStats();
  console.log('=== Database Connection Pool Statistics ===');
  console.log(`Total connections: ${stats.totalCount}`);
  console.log(`Idle connections: ${stats.idleCount}`);
  console.log(`Waiting requests: ${stats.waitingCount}`);
  console.log(`Pool utilization: ${stats.utilization}%`);
  console.log('===========================================');
}

/**
 * Health check endpoint data
 */
export async function getDatabaseHealthData() {
  try {
    const startTime = Date.now();
    await pool.query('SELECT 1');
    const responseTime = Date.now() - startTime;

    const poolStats = getPoolStats();
    const queryStatsData = getQueryStats();

    return {
      status: 'healthy',
      responseTime,
      pool: poolStats,
      queries: queryStatsData,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
