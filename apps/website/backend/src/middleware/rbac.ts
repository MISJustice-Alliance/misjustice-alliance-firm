/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Authorization middleware for checking user roles and permissions.
 * Works in conjunction with authentication middleware.
 *
 * Role Hierarchy:
 * - VIEWER: Read-only access (lowest privilege)
 * - CONTRIBUTOR: Can suggest improvements
 * - ADMIN: Can manage cases and users
 * - DEVELOPER: Full system access (highest privilege)
 *
 * Usage:
 * ```typescript
 * router.delete('/cases/:id',
 *   authenticate,
 *   requireRole(UserRole.ADMIN),
 *   deleteCase
 * );
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';
import { AuthUser } from './auth';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Permission checker function
 * Returns true if user has permission
 */
export type PermissionChecker = (user: AuthUser, req: Request) => boolean;

// ============================================================================
// ROLE HIERARCHY
// ============================================================================

/**
 * Role hierarchy (higher index = more privileges)
 * Used for hierarchical role checking
 */
const ROLE_HIERARCHY = [
  UserRole.VIEWER,
  UserRole.CONTRIBUTOR,
  UserRole.ADMIN,
  UserRole.DEVELOPER,
];

/**
 * Get role level (higher = more privileges)
 *
 * @param role - User role
 * @returns Numeric role level
 */
function getRoleLevel(role: UserRole): number {
  const level = ROLE_HIERARCHY.indexOf(role);
  return level === -1 ? 0 : level;
}

/**
 * Check if user role meets minimum required role
 *
 * @param userRole - User's current role
 * @param requiredRole - Minimum required role
 * @returns True if user has sufficient privileges
 */
function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Require specific role (exact match)
 *
 * Denies access unless user has exactly the specified role.
 *
 * @param allowedRoles - Single role or array of allowed roles
 * @returns Express middleware function
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          hint: 'Use authenticate middleware before requireRole',
        },
      });
      return;
    }

    // 2. Check if user has one of the allowed roles
    const userRole = req.user.role;
    const hasRole = allowedRoles.includes(userRole);

    if (!hasRole) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          details: {
            required: allowedRoles,
            current: userRole,
          },
        },
      });
      return;
    }

    // 3. User has required role, continue
    next();
  };
}

/**
 * Require minimum role (hierarchical)
 *
 * Allows access if user's role is >= required role.
 * Example: requireMinRole(ADMIN) allows ADMIN and DEVELOPER
 *
 * @param minRole - Minimum required role
 * @returns Express middleware function
 */
export function requireMinRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // 2. Check if user meets minimum role requirement
    const userRole = req.user.role;
    const hasMinRole = hasMinimumRole(userRole, minRole);

    if (!hasMinRole) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          details: {
            minimumRequired: minRole,
            current: userRole,
          },
        },
      });
      return;
    }

    // 3. User meets minimum role, continue
    next();
  };
}

/**
 * Require admin role
 *
 * Convenience function for admin-only routes.
 * Equivalent to requireMinRole(UserRole.ADMIN)
 *
 * @returns Express middleware function
 */
export function requireAdmin() {
  return requireMinRole(UserRole.ADMIN);
}

/**
 * Require developer role
 *
 * Convenience function for developer-only routes.
 * Equivalent to requireRole(UserRole.DEVELOPER)
 *
 * @returns Express middleware function
 */
export function requireDeveloper() {
  return requireRole(UserRole.DEVELOPER);
}

/**
 * Custom permission checker
 *
 * Allows complex permission logic beyond role-based checks.
 * Example: Check if user owns the resource being accessed.
 *
 * @param checker - Function that returns true if user has permission
 * @param errorMessage - Custom error message on denial
 * @returns Express middleware function
 */
export function requirePermission(
  checker: PermissionChecker,
  errorMessage: string = 'Permission denied'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // 2. Check custom permission
    const hasPermission = checker(req.user, req);

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: errorMessage,
        },
      });
      return;
    }

    // 3. Permission granted, continue
    next();
  };
}

/**
 * Require resource ownership
 *
 * Allows access only if user owns the resource OR is an admin.
 * Resource owner ID is extracted from request parameters or body.
 *
 * @param userIdField - Field name containing resource owner ID
 * @returns Express middleware function
 */
export function requireOwnership(userIdField: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // 2. Admins and developers can access any resource
    if (
      req.user.role === UserRole.ADMIN ||
      req.user.role === UserRole.DEVELOPER
    ) {
      next();
      return;
    }

    // 3. Check if user owns the resource
    const resourceOwnerId =
      req.params[userIdField] || req.body[userIdField];

    if (!resourceOwnerId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `Missing ${userIdField} in request`,
        },
      });
      return;
    }

    if (req.user.userId !== resourceOwnerId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only access your own resources',
        },
      });
      return;
    }

    // 4. User owns the resource, continue
    next();
  };
}

/**
 * Conditional role check
 *
 * Applies role check only if condition is met.
 * Useful for routes that are sometimes public, sometimes protected.
 *
 * @param condition - Function that returns true to apply role check
 * @param requiredRole - Role required when condition is true
 * @returns Express middleware function
 */
export function conditionalRole(
  condition: (req: Request) => boolean,
  requiredRole: UserRole
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Check if role check should be applied
    if (!condition(req)) {
      next();
      return;
    }

    // 2. Apply role check
    const roleMiddleware = requireMinRole(requiredRole);
    roleMiddleware(req, res, next);
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has specific role
 *
 * @param user - Authenticated user
 * @param role - Role to check
 * @returns True if user has the role
 */
export function hasRole(user: AuthUser | undefined, role: UserRole): boolean {
  return user?.role === role;
}

/**
 * Check if user is admin or higher
 *
 * @param user - Authenticated user
 * @returns True if user is admin or developer
 */
export function isAdmin(user: AuthUser | undefined): boolean {
  return user ? hasMinimumRole(user.role, UserRole.ADMIN) : false;
}

/**
 * Check if user is developer
 *
 * @param user - Authenticated user
 * @returns True if user is developer
 */
export function isDeveloper(user: AuthUser | undefined): boolean {
  return hasRole(user, UserRole.DEVELOPER);
}

/**
 * Get user's role level
 *
 * @param user - Authenticated user
 * @returns Numeric role level (higher = more privileges)
 */
export function getUserRoleLevel(user: AuthUser | undefined): number {
  return user ? getRoleLevel(user.role) : 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  requireRole,
  requireMinRole,
  requireAdmin,
  requireDeveloper,
  requirePermission,
  requireOwnership,
  conditionalRole,
  hasRole,
  isAdmin,
  isDeveloper,
  getUserRoleLevel,
};
