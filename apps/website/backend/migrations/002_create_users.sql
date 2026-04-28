-- ============================================================================
-- Migration: 002_create_users
-- Description: Create users table with RBAC support for authentication
-- Author: MISJustice Alliance Development Team
-- Created: 2026-01-02
-- ============================================================================

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Purpose: Store user accounts with authentication credentials and roles
-- Features:
--   - UUID primary keys
--   - Email-based authentication
--   - bcrypt password hashing
--   - Role-based access control (RBAC)
--   - Email verification tracking
--   - Account status (active/suspended)
--   - Automatic timestamps
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  -- Primary identifier
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authentication credentials
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,

  -- User profile
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  display_name VARCHAR(200),

  -- Role-based access control
  role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN (
    'viewer',      -- Read-only access to public cases
    'contributor', -- Can suggest case improvements
    'admin',       -- Can manage cases and users
    'developer'    -- Full system access including deployment
  )),

  -- Account verification and status
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMP,

  account_status VARCHAR(50) DEFAULT 'active' CHECK (account_status IN (
    'active',      -- Normal account status
    'suspended',   -- Temporarily disabled
    'deactivated'  -- Permanently disabled
  )),

  -- Password reset
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,

  -- Security tracking
  last_login TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,

  -- Audit timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- REFRESH TOKENS TABLE
-- ============================================================================
-- Purpose: Store refresh tokens for JWT authentication
-- Features:
--   - One-to-many relationship with users
--   - Token revocation support
--   - Expiration tracking
--   - Device/browser identification
-- ============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
  -- Primary identifier
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to users table
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Token data
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,

  -- Device/session tracking
  user_agent VARCHAR(500),
  ip_address VARCHAR(45), -- IPv6 compatible

  -- Token status
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,
  revoked_reason VARCHAR(255),

  -- Audit timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Purpose: Optimize query performance for authentication and user lookup

-- User lookups by email (login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- User lookups by role (authorization)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Account status queries (active users)
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

-- Email verification queries
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
  ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;

-- Password reset queries
CREATE INDEX IF NOT EXISTS idx_users_reset_token
  ON users(reset_token) WHERE reset_token IS NOT NULL;

-- Refresh token lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- User's active refresh tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Cleanup expired tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Purpose: Automatic timestamp updates

-- Update users.updated_at on row modification
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON users;
CREATE TRIGGER trigger_update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- ============================================================================
-- DEFAULT ADMIN USER
-- ============================================================================
-- Purpose: Create initial admin account for system setup
-- Note: Change this password immediately after deployment!
-- Default credentials: admin@misjustice.org / ChangeMe123!

-- Password: ChangeMe123! (bcrypt hash with 12 rounds)
INSERT INTO users (
  email,
  password_hash,
  first_name,
  last_name,
  display_name,
  role,
  email_verified,
  account_status
) VALUES (
  'admin@misjustice.org',
  '$2b$12$EPI22seF1GwJ/Wx3QNfAb.XBn7Dbtllx2AmRDAQ/d/gUTACjyBtVi', -- ChangeMe123!
  'System',
  'Administrator',
  'Admin',
  'admin',
  TRUE,
  'active'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Purpose: Validate migration success

-- Verify tables exist
SELECT 'users table created' AS status
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'users'
);

SELECT 'refresh_tokens table created' AS status
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'refresh_tokens'
);

-- Verify indexes
SELECT 'User indexes created: ' || COUNT(*)::text AS status
FROM pg_indexes
WHERE tablename IN ('users', 'refresh_tokens');

-- Verify admin user
SELECT
  'Admin user created: ' || email AS status,
  'Role: ' || role AS role_status
FROM users
WHERE email = 'admin@misjustice.org';

-- Count total users
SELECT COUNT(*) AS total_users FROM users;

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================
-- Purpose: Undo this migration if needed
-- Usage: Run these commands to remove users tables

/*
-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_users_updated_at();

-- Drop tables (CASCADE removes dependent refresh_tokens)
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Verify cleanup
SELECT 'Migration 002 rolled back successfully' AS status;
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Default admin password MUST be changed immediately after deployment
-- 2. Email verification tokens expire after 24 hours (set in application logic)
-- 3. Password reset tokens expire after 1 hour (set in application logic)
-- 4. Refresh tokens expire after 7 days (configurable in JWT settings)
-- 5. Failed login attempts reset after successful login
-- 6. Account locks expire after 15 minutes (configurable)
-- ============================================================================
