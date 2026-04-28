-- ============================================================================
-- Migration: 006_add_arns_undernames.sql
-- Purpose: Add ArNS (Arweave Name System) undername support for individual
--          document archiving with human-readable URLs
-- Author: MISJustice Alliance Development Team
-- Date: 2026-01-03
-- Version: 1.0.0
-- ============================================================================

-- ============================================================================
-- Background:
-- This migration adds support for ArNS undernames, which provide human-readable
-- URLs for individual archived documents. Example:
--   Instead of: https://arweave.net/xK7k_9...
--   Use:        https://cr-2024-001-complaint.misjusticealliance.arweave.net
--
-- This complements (does not replace) the existing bundle-level archiving.
-- ============================================================================

-- ============================================================================
-- Add ArNS Columns to case_documents Table
-- ============================================================================

-- Add ArNS undername (human-readable identifier)
ALTER TABLE case_documents
ADD COLUMN IF NOT EXISTS arns_undername VARCHAR(255);

-- Add ArNS registration status tracking
ALTER TABLE case_documents
ADD COLUMN IF NOT EXISTS arns_status VARCHAR(50) DEFAULT 'none'
  CHECK (arns_status IN (
    'none',          -- No ArNS registration attempted
    'pending',       -- Queued for registration
    'registering',   -- Registration in progress
    'active',        -- Successfully registered and active
    'failed',        -- Registration failed
    'expired'        -- ArNS registration expired
  ));

-- Add ArNS registration timestamp
ALTER TABLE case_documents
ADD COLUMN IF NOT EXISTS arns_registered_at TIMESTAMP;

-- Add ArNS full URL (cached for performance)
ALTER TABLE case_documents
ADD COLUMN IF NOT EXISTS arns_url TEXT;

-- ============================================================================
-- Create Indexes for ArNS Queries
-- ============================================================================

-- Unique index on arns_undername (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_case_documents_arns_undername
  ON case_documents(arns_undername)
  WHERE arns_undername IS NOT NULL;

-- Index for querying by ArNS status
CREATE INDEX IF NOT EXISTS idx_case_documents_arns_status
  ON case_documents(arns_status)
  WHERE arns_status != 'none';

-- Composite index for finding documents ready for ArNS registration
CREATE INDEX IF NOT EXISTS idx_case_documents_arns_registration_queue
  ON case_documents(arns_status, created_at)
  WHERE arns_status IN ('pending', 'registering')
    AND arweave_tx_id IS NOT NULL;

-- ============================================================================
-- Add Column Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN case_documents.arns_undername IS
  'ArNS undername for human-readable document URL (e.g., cr-2024-001-complaint)';

COMMENT ON COLUMN case_documents.arns_status IS
  'Current status of ArNS registration process';

COMMENT ON COLUMN case_documents.arns_registered_at IS
  'Timestamp when ArNS undername was successfully registered';

COMMENT ON COLUMN case_documents.arns_url IS
  'Full ArNS URL for quick access (e.g., https://cr-2024-001-complaint.misjusticealliance.arweave.net)';

-- ============================================================================
-- Update Existing Documents (Set Default Status)
-- ============================================================================

-- Mark all existing documents without ArNS as 'none'
UPDATE case_documents
SET arns_status = 'none'
WHERE arns_status IS NULL;

-- For documents already on Arweave but not yet assigned ArNS, mark as 'pending'
-- (These will be processed by the backfill script)
UPDATE case_documents
SET arns_status = 'pending'
WHERE arweave_tx_id IS NOT NULL
  AND (arns_status IS NULL OR arns_status = 'none')
  AND arns_undername IS NULL;

-- ============================================================================
-- Verification and Testing
-- ============================================================================

DO $$
DECLARE
  v_column_count INTEGER;
  v_index_count INTEGER;
  v_pending_count INTEGER;
BEGIN
  -- Verify all 4 columns were added
  SELECT COUNT(*)
  INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'case_documents'
    AND column_name IN ('arns_undername', 'arns_status', 'arns_registered_at', 'arns_url');

  ASSERT v_column_count = 4,
    'Expected 4 ArNS columns to be added, found ' || v_column_count;

  -- Verify indexes were created
  SELECT COUNT(*)
  INTO v_index_count
  FROM pg_indexes
  WHERE tablename = 'case_documents'
    AND indexname LIKE '%arns%';

  ASSERT v_index_count = 3,
    'Expected 3 ArNS indexes to be created, found ' || v_index_count;

  -- Count documents pending ArNS registration
  SELECT COUNT(*)
  INTO v_pending_count
  FROM case_documents
  WHERE arns_status = 'pending';

  RAISE NOTICE 'Migration 006_add_arns_undernames.sql completed successfully';
  RAISE NOTICE 'Added columns: arns_undername, arns_status, arns_registered_at, arns_url';
  RAISE NOTICE 'Created 3 indexes for ArNS queries';
  RAISE NOTICE 'Documents pending ArNS registration: %', v_pending_count;
END $$;

-- ============================================================================
-- Rollback Script (for migration reversal if needed)
-- ============================================================================

-- To rollback this migration, run:
/*
DROP INDEX IF EXISTS idx_case_documents_arns_registration_queue;
DROP INDEX IF EXISTS idx_case_documents_arns_status;
DROP INDEX IF EXISTS idx_case_documents_arns_undername;

ALTER TABLE case_documents DROP COLUMN IF EXISTS arns_url;
ALTER TABLE case_documents DROP COLUMN IF EXISTS arns_registered_at;
ALTER TABLE case_documents DROP COLUMN IF EXISTS arns_status;
ALTER TABLE case_documents DROP COLUMN IF EXISTS arns_undername;
*/

-- ============================================================================
-- End of Migration
-- ============================================================================
