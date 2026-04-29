/**
 * Database monitoring types
 * These types mirror the backend database monitoring utilities
 */

export const HealthStatus = {
  OK: 'OK',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  ERROR: 'ERROR',
} as const;

export type HealthStatus = (typeof HealthStatus)[keyof typeof HealthStatus];

export interface HealthMetric {
  metric: string;
  value: string;
  threshold: string | null;
  status: HealthStatus;
}

export interface ConnectionPoolStats {
  database: string;
  activeConnections: number;
  databaseSize: string;
  maxConnections: number;
  connectionUsagePct: number;
}

export interface CacheHitRatio {
  cacheType: string;
  diskReads: number;
  cacheHits: number;
  hitRatioPct: number;
}

export interface SlowQuery {
  queryPreview: string;
  executionCount: number;
  totalTimeMs: number;
  avgTimeMs: number;
  maxTimeMs: number;
  variancePct: number;
  totalRowsReturned: number;
}

export interface TableBloatStats {
  schemaname: string;
  tablename: string;
  totalSize: string;
  tableSize: string;
  indexesSize: string;
  liveTuples: number;
  deadTuples: number;
  deadTuplePct: number;
  lastVacuum: string | null;
  lastAutovacuum: string | null;
}

export interface IndexUsageStats {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexScans: number;
  tuplesRead: number;
  tuplesFetched: number;
  indexSize: string;
}

export interface MaintenanceRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  reason: string;
}

export interface DatabaseHealthData {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  pool?: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
    utilization: number;
  };
  queries?: {
    totalQueries: number;
    slowQueries: number;
    totalExecutionTime: number;
    errorCount: number;
    averageExecutionTime: number;
    slowQueryPercentage: number;
  };
  error?: string;
}
