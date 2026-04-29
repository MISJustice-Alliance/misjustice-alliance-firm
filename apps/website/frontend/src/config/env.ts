/**
 * Environment Configuration
 *
 * Centralizes all environment-specific configuration.
 * Uses Vite's import.meta.env for environment variables.
 */

export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  environment: import.meta.env.MODE || 'development',
} as const;
