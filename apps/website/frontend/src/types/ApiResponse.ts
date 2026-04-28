/**
 * API Response Types
 *
 * These types define the standard response format from the backend API.
 * All API endpoints return either ApiSuccessResponse<T> or ApiErrorResponse.
 */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
