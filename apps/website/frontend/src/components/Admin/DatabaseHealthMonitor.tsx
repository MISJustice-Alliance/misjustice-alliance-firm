import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { adminService } from '../../services/adminService';
import type {
  HealthMetric,
  ConnectionPoolStats,
  CacheHitRatio,
  HealthStatus,
} from '../../types/DatabaseMonitoring';

interface DatabaseHealthMonitorProps {
  refreshInterval?: number; // milliseconds, default 30000 (30 seconds)
}

export const DatabaseHealthMonitor = ({
  refreshInterval = 30000,
}: DatabaseHealthMonitorProps) => {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [poolStats, setPoolStats] = useState<ConnectionPoolStats | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheHitRatio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealthData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const [metrics, pool, cache] = await Promise.all([
        adminService.getDatabaseHealth(),
        adminService.getConnectionPoolStats(),
        adminService.getCacheHitRatio(),
      ]);

      setHealthMetrics(metrics);
      setPoolStats(pool);
      setCacheStats(cache);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch database health data';
      setError(errorMessage);
      console.error('Error fetching database health:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthData();

    // Set up auto-refresh interval
    const interval = setInterval(fetchHealthData, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case 'OK':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'WARNING':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'CRITICAL':
      case 'ERROR':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <CheckCircleIcon className="h-5 w-5 text-neutral-500" />;
    }
  };

  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case 'OK':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'WARNING':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'CRITICAL':
      case 'ERROR':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    }
  };

  const getUtilizationColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getCacheHitColor = (pct: number) => {
    if (pct >= 99) return 'text-green-600';
    if (pct >= 95) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
        <div className="flex items-center justify-center">
          <ArrowPathIcon className="h-8 w-8 text-primary-600 animate-spin" />
          <span className="ml-3 text-neutral-600">Loading database health data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-8">
        <div className="flex items-center">
          <XCircleIcon className="h-6 w-6 text-red-500" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Failed to load database health data
            </h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchHealthData}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Database Health Monitor</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchHealthData}
          disabled={isRefreshing}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium flex items-center gap-2"
        >
          <ArrowPathIcon
            className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Connection Pool Stats */}
      {poolStats && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Connection Pool
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-neutral-600">Database</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">
                {poolStats.database}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Active Connections</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">
                {poolStats.activeConnections} / {poolStats.maxConnections}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Database Size</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">
                {poolStats.databaseSize}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Utilization</p>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-neutral-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getUtilizationColor(
                        poolStats.connectionUsagePct
                      )}`}
                      style={{ width: `${poolStats.connectionUsagePct}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">
                    {poolStats.connectionUsagePct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cache Hit Ratios */}
      {cacheStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Cache Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cacheStats.map((cache) => (
              <div key={cache.cacheType} className="border border-neutral-200 rounded-lg p-4">
                <p className="text-sm font-medium text-neutral-700">
                  {cache.cacheType}
                </p>
                <p className={`mt-1 text-2xl font-bold ${getCacheHitColor(cache.hitRatioPct)}`}>
                  {cache.hitRatioPct.toFixed(2)}%
                </p>
                <div className="mt-2 flex justify-between text-xs text-neutral-600">
                  <span>Hits: {cache.cacheHits.toLocaleString()}</span>
                  <span>Reads: {cache.diskReads.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          Health Metrics
        </h3>
        <div className="space-y-3">
          {healthMetrics.map((metric, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 rounded-lg border ${getStatusColor(
                metric.status
              )}`}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(metric.status)}
                <div>
                  <p className="font-medium">{metric.metric}</p>
                  {metric.threshold && (
                    <p className="text-xs mt-1 opacity-75">
                      Threshold: {metric.threshold}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{metric.value}</p>
                <p className="text-xs mt-1 opacity-75">{metric.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
