/**
 * User Model
 * TypeScript interfaces and types for user authentication and authorization
 */

/**
 * User role enumeration
 * Defines role-based access control levels
 */
export enum UserRole {
  VIEWER = 'viewer',           // Read-only access to public cases
  CONTRIBUTOR = 'contributor', // Can suggest case improvements
  ADMIN = 'admin',             // Can manage cases and users
  DEVELOPER = 'developer',     // Full system access including deployment
}

/**
 * Account status enumeration
 */
export enum AccountStatus {
  ACTIVE = 'active',           // Normal account status
  SUSPENDED = 'suspended',     // Temporarily disabled
  DEACTIVATED = 'deactivated', // Permanently disabled
}

/**
 * Main User interface (safe for API responses)
 */
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  role: UserRole;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // NOTE: passwordHash is intentionally excluded for security
}

/**
 * User with password hash (for authentication service only)
 * Never expose password hash in API responses
 */
export interface UserWithPassword extends User {
  passwordHash: string;
}

/**
 * DTO for creating a new user (internal use)
 */
export interface CreateUserDTO {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role?: UserRole;
  emailVerified?: boolean;
}

/**
 * DTO for user registration (public API)
 */
export interface RegisterUserDTO {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

/**
 * DTO for user login
 */
export interface LoginUserDTO {
  email: string;
  password: string;
}

/**
 * DTO for updating user
 */
export interface UpdateUserDTO {
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role?: UserRole;
  emailVerified?: boolean;
  accountStatus?: AccountStatus;
}

/**
 * JWT payload interface
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
}

/**
 * Type guard to check if value is a valid UserRole
 */
export function isValidUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

/**
 * Type guard to check if value is a valid AccountStatus
 */
export function isValidAccountStatus(value: string): value is AccountStatus {
  return Object.values(AccountStatus).includes(value as AccountStatus);
}

/**
 * Sanitize user object for API response
 * Removes password hash and other sensitive fields
 */
export function sanitizeUser(user: UserWithPassword): User {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
