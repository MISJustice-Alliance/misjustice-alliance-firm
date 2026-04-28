import type { ApiResponse } from '../types/ApiResponse';
import type {
  DatabaseHealthData,
  HealthMetric,
  ConnectionPoolStats,
  CacheHitRatio,
  SlowQuery,
  TableBloatStats,
  MaintenanceRecommendation,
} from '../types/DatabaseMonitoring';
import { config } from '../config/env';

const API_BASE_URL = config.apiBaseUrl;

/**
 * Admin service for database monitoring and system health
 * NOTE: These endpoints require admin authentication
 */
class AdminService {
  /**
   * Get overall database health summary
   */
  async getDatabaseHealth(): Promise<HealthMetric[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/database/health`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch database health: ${response.statusText}`);
      }

      const result: ApiResponse<HealthMetric[]> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(
          result.success === false
            ? result.error.message
            : 'Invalid response format from server'
        );
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching database health:', error);
      throw error;
    }
  }

  /**
   * Get connection pool statistics
   */
  async getConnectionPoolStats(): Promise<ConnectionPoolStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/database/pool-stats`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pool stats: ${response.statusText}`);
      }

      const result: ApiResponse<ConnectionPoolStats> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(
          result.success === false
            ? result.error.message
            : 'Invalid response format from server'
        );
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching pool stats:', error);
      throw error;
    }
  }

  /**
   * Get cache hit ratio statistics
   */
  async getCacheHitRatio(): Promise<CacheHitRatio[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/database/cache-stats`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cache stats: ${response.statusText}`);
      }

      const result: ApiResponse<CacheHitRatio[]> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(
          result.success === false
            ? result.error.message
            : 'Invalid response format from server'
        );
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      throw error;
    }
  }

  /**
   * Get slow queries
   */
  async getSlowQueries(limit: number = 10): Promise<SlowQuery[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/database/slow-queries?limit=${limit}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch slow queries: ${response.statusText}`);
      }

      const result: ApiResponse<SlowQuery[]> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(
          result.success === false
            ? result.error.message
            : 'Invalid response format from server'
        );
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching slow queries:', error);
      // Return empty array if pg_stat_statements not enabled
      return [];
    }
  }

  /**
   * Get table bloat statistics
   */
  async getTableBloatStats(): Promise<TableBloatStats[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/database/table-bloat`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch table bloat stats: ${response.statusText}`);
      }

      const result: ApiResponse<TableBloatStats[]> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(
          result.success === false
            ? result.error.message
            : 'Invalid response format from server'
        );
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching table bloat stats:', error);
      throw error;
    }
  }

  /**
   * Get maintenance recommendations
   */
  async getMaintenanceRecommendations(): Promise<MaintenanceRecommendation[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/database/maintenance`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch maintenance recommendations: ${response.statusText}`);
      }

      const result: ApiResponse<MaintenanceRecommendation[]> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(
          result.success === false
            ? result.error.message
            : 'Invalid response format from server'
        );
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching maintenance recommendations:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive database health data (for health check endpoint)
   */
  async getDatabaseHealthData(): Promise<DatabaseHealthData> {
    try {
      const response = await fetch(`${API_BASE_URL}/health/database`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch database health data: ${response.statusText}`);
      }

      const result: ApiResponse<DatabaseHealthData> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(
          result.success === false
            ? result.error.message
            : 'Invalid response format from server'
        );
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching database health data:', error);
      // Return unhealthy status on error
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get authorization headers (placeholder for future auth implementation)
   * TODO: Implement actual JWT token retrieval from auth store
   */
  private getAuthHeaders(): Record<string, string> {
    // For now, return empty headers
    // In production, this would include: Authorization: `Bearer ${token}`
    return {
      'Content-Type': 'application/json',
    };
  }
}

export const adminService = new AdminService();
