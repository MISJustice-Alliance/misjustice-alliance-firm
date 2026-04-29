/**
 * Error Handler Middleware
 * Centralized error handling for Express
 */

import { Request, Response, NextFunction } from 'express';
import { CaseServiceError } from '../services/CaseService';

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Global error handler middleware
 * Note: All 4 parameters (err, req, res, next) are required by Express's ErrorRequestHandler interface.
 * Express identifies error handlers by their 4-parameter signature, even if some parameters are unused.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // req and next are required by Express error handler signature but unused in this handler
  void req;
  void next;

  console.error('❌ Error:', err);

  // Handle CaseServiceError
  if (err instanceof CaseServiceError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.name,
        message: err.message,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.message,
      },
    };

    res.status(400).json(response);
    return;
  }

  // Handle database errors
  if (err.name === 'QueryFailedError' || err.message.includes('database')) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
      },
    };

    res.status(500).json(response);
    return;
  }

  // Default error response
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An internal server error occurred'
        : err.message,
    },
  };

  res.status(500).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  };

  res.status(404).json(response);
}
