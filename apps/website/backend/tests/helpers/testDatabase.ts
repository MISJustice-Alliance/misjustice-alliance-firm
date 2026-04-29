/**
 * Test Database Utilities
 *
 * Helper functions for managing test database:
 * - Creating/dropping test database
 * - Running migrations
 * - Cleaning tables between tests
 * - Managing database connections
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

let testPool: Pool | null = null;

/**
 * Get or create test database connection pool
 *
 * @returns PostgreSQL connection pool
 */
export function getTestPool(): Pool {
  if (!testPool) {
    testPool = new Pool({
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      ssl: process.env.DATABASE_SSL === 'true',
      max: 10, // Maximum connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  return testPool;
}

/**
 * Close test database connection pool
 *
 * Call this in afterAll() hooks to prevent hanging tests
 */
export async function closeTestPool(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Create test database (if it doesn't exist)
 *
 * Note: Requires connection to 'postgres' database first
 */
export async function createTestDatabase(): Promise<void> {
  const adminPool = new Pool({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: 'postgres', // Connect to default database
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  });

  try {
    const dbName = process.env.DATABASE_NAME;

    // Check if database exists
    const checkResult = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkResult.rows.length === 0) {
      // Create test database
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✓ Test database '${dbName}' created`);
    }
  } finally {
    await adminPool.end();
  }
}

/**
 * Drop test database
 *
 * WARNING: This deletes all test data!
 */
export async function dropTestDatabase(): Promise<void> {
  const adminPool = new Pool({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: 'postgres',
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  });

  try {
    const dbName = process.env.DATABASE_NAME;

    // Terminate existing connections
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [dbName]);

    // Drop database
    await adminPool.query(`DROP DATABASE IF EXISTS ${dbName}`);
    console.log(`✓ Test database '${dbName}' dropped`);
  } finally {
    await adminPool.end();
  }
}

// ============================================================================
// MIGRATIONS
// ============================================================================

/**
 * Run all migrations on test database
 *
 * Reads migration files from migrations/ directory and executes them
 */
export async function runMigrations(): Promise<void> {
  const pool = getTestPool();
  const fs = require('fs');
  const path = require('path');

  const migrationsDir = path.join(__dirname, '../../migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      await pool.query(sql);
      if (process.env.DEBUG) {
        console.log(`✓ Migration '${file}' applied`);
      }
    } catch (error) {
      console.error(`✗ Migration '${file}' failed:`, error);
      throw error;
    }
  }
}

// ============================================================================
// TABLE CLEANUP
// ============================================================================

/**
 * Truncate all tables (reset database to clean state)
 *
 * Use this in beforeEach() hooks to ensure test isolation
 */
export async function truncateAllTables(): Promise<void> {
  const pool = getTestPool();

  await pool.query(`
    TRUNCATE TABLE
      refresh_tokens,
      users,
      legal_cases,
      case_documents
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Delete all users (but keep schema)
 */
export async function deleteAllUsers(): Promise<void> {
  const pool = getTestPool();
  await pool.query('DELETE FROM users');
}

/**
 * Delete all refresh tokens
 */
export async function deleteAllRefreshTokens(): Promise<void> {
  const pool = getTestPool();
  await pool.query('DELETE FROM refresh_tokens');
}

/**
 * Delete all cases and documents
 */
export async function deleteAllCases(): Promise<void> {
  const pool = getTestPool();
  await pool.query('DELETE FROM case_documents');
  await pool.query('DELETE FROM legal_cases');
}

// ============================================================================
// TRANSACTION HELPERS
// ============================================================================

/**
 * Execute code within a database transaction
 *
 * Automatically rolls back after execution (useful for test isolation)
 *
 * @param callback - Function to execute within transaction
 * @returns Result of callback
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getTestPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('ROLLBACK'); // Always rollback in tests
    return result;
  } finally {
    client.release();
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Execute raw SQL query (for test setup/assertions)
 *
 * @param sql - SQL query
 * @param params - Query parameters
 * @returns Query result
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getTestPool();
  return pool.query<T>(sql, params);
}

/**
 * Get count of records in a table
 *
 * @param tableName - Name of table
 * @returns Number of records
 */
export async function getTableCount(tableName: string): Promise<number> {
  const result = await query<{ count: string }>(`SELECT COUNT(*) as count FROM ${tableName}`);
  return parseInt(result.rows[0].count);
}
