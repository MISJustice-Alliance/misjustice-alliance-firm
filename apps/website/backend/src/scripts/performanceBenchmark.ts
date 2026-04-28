/**
 * Database Performance Benchmark
 * Test query performance before/after index optimization
 *
 * Usage:
 *   ts-node src/scripts/performanceBenchmark.ts
 *   npm run benchmark
 */

import { pool } from '../config/database';

/**
 * Benchmark result
 */
interface BenchmarkResult {
  queryName: string;
  executionTimeMs: number;
  rowsReturned: number;
  avgTimePer1000Rows?: number;
}

/**
 * Run a query multiple times and return average execution time
 */
async function benchmarkQuery(
  queryName: string,
  query: string,
  params: unknown[] = [],
  iterations: number = 10
): Promise<BenchmarkResult> {
  const timings: number[] = [];
  let rowCount = 0;

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    const result = await pool.query(query, params);
    const executionTime = Date.now() - start;

    timings.push(executionTime);
    rowCount = result.rows.length;
  }

  const avgExecutionTime = timings.reduce((sum, t) => sum + t, 0) / timings.length;

  return {
    queryName,
    executionTimeMs: Math.round(avgExecutionTime * 100) / 100,
    rowsReturned: rowCount,
    avgTimePer1000Rows:
      rowCount > 0 ? Math.round((avgExecutionTime / rowCount) * 1000 * 100) / 100 : undefined,
  };
}

/**
 * Benchmark: Case search by status
 */
async function benchmarkCaseSearchByStatus(): Promise<BenchmarkResult> {
  return benchmarkQuery(
    'Case search by status',
    `
    SELECT id, case_number, plaintiff, defendant, status, created_at
    FROM legal_cases
    WHERE status = $1
    LIMIT 100
  `,
    ['intake']
  );
}

/**
 * Benchmark: Case search by status + jurisdiction (composite index test)
 */
async function benchmarkCaseSearchByStatusAndJurisdiction(): Promise<BenchmarkResult> {
  return benchmarkQuery(
    'Case search by status + jurisdiction (composite index)',
    `
    SELECT id, case_number, plaintiff, defendant, status, jurisdiction
    FROM legal_cases
    WHERE status = $1 AND jurisdiction LIKE $2
    LIMIT 100
  `,
    ['intake', '%District Court%']
  );
}

/**
 * Benchmark: Full-text search on case facts
 */
async function benchmarkCaseFullTextSearch(): Promise<BenchmarkResult> {
  return benchmarkQuery(
    'Full-text search on case facts (GIN index)',
    `
    SELECT id, case_number, plaintiff, defendant, case_facts
    FROM legal_cases
    WHERE to_tsvector('english', case_facts) @@ to_tsquery('english', $1)
    LIMIT 50
  `,
    ['police | misconduct']
  );
}

/**
 * Benchmark: Case search by status + sort by created_at
 */
async function benchmarkCaseSearchWithSort(): Promise<BenchmarkResult> {
  return benchmarkQuery(
    'Case search by status with sort (composite index)',
    `
    SELECT id, case_number, plaintiff, defendant, status, created_at
    FROM legal_cases
    WHERE status = $1
    ORDER BY created_at DESC
    LIMIT 20
  `,
    ['intake']
  );
}

/**
 * Benchmark: Document lookup by case_id
 */
async function benchmarkDocumentsByCaseId(): Promise<BenchmarkResult> {
  // First get a case ID
  const caseResult = await pool.query(`SELECT id FROM legal_cases LIMIT 1`);

  if (caseResult.rows.length === 0) {
    return {
      queryName: 'Documents by case_id',
      executionTimeMs: 0,
      rowsReturned: 0,
    };
  }

  const caseId = caseResult.rows[0].id;

  return benchmarkQuery(
    'Documents by case_id',
    `
    SELECT id, document_name, document_type, arweave_tx_id
    FROM case_documents
    WHERE case_id = $1
  `,
    [caseId]
  );
}

/**
 * Benchmark: Document lookup by case_id + type (composite index test)
 */
async function benchmarkDocumentsByCaseIdAndType(): Promise<BenchmarkResult> {
  // First get a case ID
  const caseResult = await pool.query(`SELECT id FROM legal_cases LIMIT 1`);

  if (caseResult.rows.length === 0) {
    return {
      queryName: 'Documents by case_id + type (composite index)',
      executionTimeMs: 0,
      rowsReturned: 0,
    };
  }

  const caseId = caseResult.rows[0].id;

  return benchmarkQuery(
    'Documents by case_id + type (composite index)',
    `
    SELECT id, document_name, document_type, arweave_tx_id
    FROM case_documents
    WHERE case_id = $1 AND document_type = $2
  `,
    [caseId, 'complaint']
  );
}

/**
 * Benchmark: User lookup by email (login simulation)
 */
async function benchmarkUserLookupByEmail(): Promise<BenchmarkResult> {
  return benchmarkQuery(
    'User lookup by email (login)',
    `
    SELECT id, email, password_hash, role, account_status
    FROM users
    WHERE email = $1 AND account_status = 'active'
  `,
    ['admin@misjustice.org']
  );
}

/**
 * Benchmark: Active refresh tokens for user
 */
async function benchmarkActiveRefreshTokens(): Promise<BenchmarkResult> {
  // Get first user ID
  const userResult = await pool.query(`SELECT id FROM users LIMIT 1`);

  if (userResult.rows.length === 0) {
    return {
      queryName: 'Active refresh tokens',
      executionTimeMs: 0,
      rowsReturned: 0,
    };
  }

  const userId = userResult.rows[0].id;

  return benchmarkQuery(
    'Active refresh tokens (composite index)',
    `
    SELECT id, token_hash, expires_at
    FROM refresh_tokens
    WHERE user_id = $1 AND expires_at > NOW() AND revoked = FALSE
  `,
    [userId]
  );
}

/**
 * Benchmark: Email audit logs by recipient + event type
 */
async function benchmarkEmailAuditLogs(): Promise<BenchmarkResult> {
  return benchmarkQuery(
    'Email audit logs by recipient + event (composite index)',
    `
    SELECT id, event_type, recipient, subject, timestamp
    FROM email_audit_logs
    WHERE recipient = $1 AND event_type = $2
    ORDER BY timestamp DESC
    LIMIT 50
  `,
    ['admin@misjustice.org', 'delivered']
  );
}

/**
 * Benchmark: Fuzzy case number search (pg_trgm test)
 */
async function benchmarkFuzzyCaseNumberSearch(): Promise<BenchmarkResult> {
  return benchmarkQuery(
    'Fuzzy case number search (pg_trgm)',
    `
    SELECT id, case_number, plaintiff, defendant
    FROM legal_cases
    WHERE case_number ILIKE $1
    LIMIT 20
  `,
    ['TEST%']
  );
}

/**
 * Format benchmark results as table
 */
function formatResults(results: BenchmarkResult[]): void {
  console.log('\n='.repeat(80));
  console.log('DATABASE PERFORMANCE BENCHMARK RESULTS');
  console.log('='.repeat(80));
  console.log('\nExecuted: ' + new Date().toISOString());
  console.log('Iterations per query: 10 (average times shown)');
  console.log('\n' + '─'.repeat(80));

  // Sort by execution time
  const sortedResults = [...results].sort((a, b) => a.executionTimeMs - b.executionTimeMs);

  // Find max query name length for alignment
  const maxNameLength = Math.max(...results.map((r) => r.queryName.length));

  // Print header
  console.log(
    `${'Query'.padEnd(maxNameLength)} | ${'Avg Time'.padStart(10)} | ${'Rows'.padStart(6)} | ${'ms/1000 rows'.padStart(14)}`
  );
  console.log('─'.repeat(80));

  // Print results
  sortedResults.forEach((result) => {
    const avgTimePer1000 = result.avgTimePer1000Rows
      ? result.avgTimePer1000Rows.toFixed(2) + ' ms'
      : 'N/A';

    console.log(
      `${result.queryName.padEnd(maxNameLength)} | ${(result.executionTimeMs.toFixed(2) + ' ms').padStart(10)} | ${result.rowsReturned.toString().padStart(6)} | ${avgTimePer1000.padStart(14)}`
    );
  });

  console.log('─'.repeat(80));

  // Calculate and show summary statistics
  const totalTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0);
  const avgTime = totalTime / results.length;
  const slowestQuery = sortedResults[sortedResults.length - 1];
  const fastestQuery = sortedResults[0];

  console.log('\nSummary Statistics:');
  console.log(`  Total benchmark time: ${totalTime.toFixed(2)} ms`);
  console.log(`  Average query time: ${avgTime.toFixed(2)} ms`);
  console.log(`  Fastest query: ${fastestQuery.queryName} (${fastestQuery.executionTimeMs.toFixed(2)} ms)`);
  console.log(`  Slowest query: ${slowestQuery.queryName} (${slowestQuery.executionTimeMs.toFixed(2)} ms)`);

  // Performance ratings
  console.log('\nPerformance Ratings:');
  results.forEach((result) => {
    let rating: string;
    let symbol: string;

    if (result.executionTimeMs < 10) {
      rating = 'EXCELLENT';
      symbol = '✅';
    } else if (result.executionTimeMs < 50) {
      rating = 'GOOD';
      symbol = '👍';
    } else if (result.executionTimeMs < 200) {
      rating = 'ACCEPTABLE';
      symbol = '⚠️';
    } else {
      rating = 'NEEDS OPTIMIZATION';
      symbol = '❌';
    }

    console.log(`  ${symbol} ${result.queryName}: ${rating}`);
  });

  console.log('\n' + '='.repeat(80));
}

/**
 * Main benchmark function
 */
async function runBenchmark(): Promise<void> {
  console.log('Starting database performance benchmark...');
  console.log('This may take 1-2 minutes to complete.\n');

  try {
    const results: BenchmarkResult[] = [];

    // Run all benchmarks
    console.log('⏳ Running benchmarks...');

    results.push(await benchmarkCaseSearchByStatus());
    results.push(await benchmarkCaseSearchByStatusAndJurisdiction());
    results.push(await benchmarkCaseFullTextSearch());
    results.push(await benchmarkCaseSearchWithSort());
    results.push(await benchmarkDocumentsByCaseId());
    results.push(await benchmarkDocumentsByCaseIdAndType());
    results.push(await benchmarkUserLookupByEmail());
    results.push(await benchmarkActiveRefreshTokens());
    results.push(await benchmarkEmailAuditLogs());
    results.push(await benchmarkFuzzyCaseNumberSearch());

    // Display results
    formatResults(results);

    console.log('\n✅ Benchmark completed successfully!');
    console.log('\nRecommendations:');
    console.log('  - Queries >200ms: Consider optimizing or adding indexes');
    console.log('  - Queries <10ms: Excellent performance, indexes working well');
    console.log('  - Run VACUUM ANALYZE regularly to maintain performance');
    console.log('  - Monitor slow_query_stats view for production issues\n');
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run benchmark if executed directly
if (require.main === module) {
  runBenchmark().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runBenchmark, benchmarkQuery };
