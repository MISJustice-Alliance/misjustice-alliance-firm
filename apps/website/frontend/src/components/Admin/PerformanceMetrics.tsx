import { useState, useEffect, useCallback } from 'react';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { adminService } from '../../services/adminService';
import type {
  SlowQuery,
  TableBloatStats,
  MaintenanceRecommendation,
} from '../../types/DatabaseMonitoring';

interface PerformanceMetricsProps {
  refreshInterval?: number; // milliseconds, default 60000 (60 seconds)
  slowQueryLimit?: number; // number of slow queries to display, default 10
}

export const PerformanceMetrics = ({
  refreshInterval = 60000,
  slowQueryLimit = 10,
}: PerformanceMetricsProps) => {
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [tableBloat, setTableBloat] = useState<TableBloatStats[]>([]);
  const [recommendations, setRecommendations] = useState<MaintenanceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPerformanceData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const [queries, bloat, recs] = await Promise.all([
        adminService.getSlowQueries(slowQueryLimit),
        adminService.getTableBloatStats(),
        adminService.getMaintenanceRecommendations(),
      ]);

      setSlowQueries(queries);
      setTableBloat(bloat);
      setRecommendations(recs);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch performance metrics';
      setError(errorMessage);
      console.error('Error fetching performance metrics:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [slowQueryLimit]);

  useEffect(() => {
    fetchPerformanceData();

    // Set up auto-refresh interval
    const interval = setInterval(fetchPerformanceData, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, slowQueryLimit, fetchPerformanceData]);

  const getPriorityBadgeColor = (priority: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  const getPriorityIcon = (priority: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (priority) {
      case 'HIGH':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case 'MEDIUM':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'LOW':
        return <CheckCircleIcon className="h-5 w-5 text-blue-600" />;
      default:
        return <CheckCircleIcon className="h-5 w-5 text-neutral-600" />;
    }
  };

  const formatQueryPreview = (query: string, maxLength: number = 100) => {
    if (query.length <= maxLength) return query;
    return query.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
        <div className="flex items-center justify-center">
          <ArrowPathIcon className="h-8 w-8 text-primary-600 animate-spin" />
          <span className="ml-3 text-neutral-600">Loading performance metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-8">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Failed to load performance metrics
            </h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchPerformanceData}
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
          <h2 className="text-2xl font-bold text-neutral-900">Performance Metrics</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchPerformanceData}
          disabled={isRefreshing}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium flex items-center gap-2"
        >
          <ArrowPathIcon
            className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Maintenance Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-neutral-900">
              Maintenance Recommendations
            </h3>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getPriorityIcon(rec.priority)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-semibold border ${getPriorityBadgeColor(
                            rec.priority
                          )}`}
                        >
                          {rec.priority}
                        </span>
                      </div>
                      <p className="font-medium text-neutral-900">{rec.action}</p>
                      <p className="mt-1 text-sm text-neutral-600">{rec.reason}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slow Queries */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClockIcon className="h-6 w-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-neutral-900">
            Slow Queries
            {slowQueries.length > 0 && (
              <span className="ml-2 text-sm font-normal text-neutral-600">
                (Top {slowQueries.length})
              </span>
            )}
          </h3>
        </div>

        {slowQueries.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-neutral-600">
              No slow queries detected or pg_stat_statements extension not enabled
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {slowQueries.map((query, index) => (
              <div
                key={index}
                className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <code className="flex-1 text-xs bg-neutral-50 p-2 rounded font-mono text-neutral-800 overflow-x-auto">
                    {formatQueryPreview(query.queryPreview, 150)}
                  </code>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
                  <div>
                    <p className="text-xs text-neutral-600">Executions</p>
                    <p className="text-sm font-semibold text-neutral-900">
                      {query.executionCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Avg Time</p>
                    <p className="text-sm font-semibold text-neutral-900">
                      {query.avgTimeMs.toFixed(2)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Max Time</p>
                    <p className="text-sm font-semibold text-red-600">
                      {query.maxTimeMs.toFixed(2)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Total Time</p>
                    <p className="text-sm font-semibold text-neutral-900">
                      {(query.totalTimeMs / 1000).toFixed(2)}s
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Variance</p>
                    <p className="text-sm font-semibold text-neutral-900">
                      {query.variancePct.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Rows</p>
                    <p className="text-sm font-semibold text-neutral-900">
                      {query.totalRowsReturned.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table Bloat Statistics */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ChartBarIcon className="h-6 w-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-neutral-900">Table Bloat Statistics</h3>
        </div>

        {tableBloat.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-neutral-600">No table bloat data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Schema
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Table
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Total Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Live Tuples
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Dead Tuples
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Bloat %
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Last Vacuum
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {tableBloat.map((table, index) => (
                  <tr key={index} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">
                      {table.schemaname}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900">
                      {table.tablename}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">
                      {table.totalSize}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">
                      {table.liveTuples.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">
                      {table.deadTuples.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`font-semibold ${
                          table.deadTuplePct > 20
                            ? 'text-red-600'
                            : table.deadTuplePct > 10
                              ? 'text-yellow-600'
                              : 'text-green-600'
                        }`}
                      >
                        {table.deadTuplePct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600">
                      {table.lastVacuum
                        ? new Date(table.lastVacuum).toLocaleString()
                        : table.lastAutovacuum
                          ? `Auto: ${new Date(table.lastAutovacuum).toLocaleString()}`
                          : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
