import type { Case, CaseStatus } from '../types/Case';
import type { ApiResponse } from '../types/ApiResponse';
import { config } from '../config/env';

const API_BASE_URL = config.apiBaseUrl;

/**
 * Case search/filter parameters
 */
export interface CaseSearchParams {
  searchQuery?: string;
  status?: CaseStatus;
  jurisdiction?: string;
  filedDateFrom?: string;
  filedDateTo?: string;
  page?: number;
  pageSize?: number;
}

class CaseService {
  /**
   * Get all cases (paginated)
   */
  async getAllCases(page: number = 1, pageSize: number = 100): Promise<Case[]> {
    try {
      const url = new URL(`${API_BASE_URL}/cases`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('pageSize', pageSize.toString());

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Failed to fetch cases: ${response.statusText}`);
      }

      const result: ApiResponse<Case[]> = await response.json();

      // Validate response structure
      if (!result.success || !result.data) {
        throw new Error(
          result.success === false
            ? result.error.message
            : 'Invalid response format from server'
        );
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching cases:', error);
      throw error;
    }
  }

  /**
   * Search cases with filters (leverages backend composite indexes)
   */
  async searchCases(params: CaseSearchParams): Promise<Case[]> {
    try {
      const url = new URL(`${API_BASE_URL}/cases`);

      // Add query parameters for filtering
      if (params.searchQuery) {
        // Full-text search (uses GIN index on case_facts)
        url.searchParams.append('q', params.searchQuery);
      }

      if (params.status) {
        // Status filter (uses status index or status+jurisdiction composite)
        url.searchParams.append('status', params.status);
      }

      if (params.jurisdiction) {
        // Jurisdiction filter (uses status+jurisdiction composite index)
        url.searchParams.append('jurisdiction', params.jurisdiction);
      }

      if (params.filedDateFrom) {
        // Date range filter (uses filed_date index)
        url.searchParams.append('filedDateFrom', params.filedDateFrom);
      }

      if (params.filedDateTo) {
        url.searchParams.append('filedDateTo', params.filedDateTo);
      }

      // Pagination
      url.searchParams.append('page', (params.page || 1).toString());
      url.searchParams.append('pageSize', (params.pageSize || 100).toString());

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Failed to search cases: ${response.statusText}`);
      }

      const result: ApiResponse<Case[]> = await response.json();

      // Validate response structure
      if (!result.success || !result.data) {
        throw new Error(
          result.success === false
            ? result.error.message
            : 'Invalid response format from server'
        );
      }

      return result.data;
    } catch (error) {
      console.error('Error searching cases:', error);
      throw error;
    }
  }

  /**
   * Get case by ID
   */
  async getCaseById(id: string): Promise<Case> {
    try {
      const response = await fetch(`${API_BASE_URL}/cases/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch case: ${response.statusText}`);
      }

      const result: ApiResponse<Case> = await response.json();

      // Validate response structure
      if (!result.success || !result.data) {
        throw new Error(
          result.success === false
            ? result.error.message
            : 'Invalid response format from server'
        );
      }

      return result.data;
    } catch (error) {
      console.error(`Error fetching case ${id}:`, error);
      throw error;
    }
  }
}

export const caseService = new CaseService();
