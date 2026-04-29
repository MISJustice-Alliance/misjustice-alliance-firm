-- ============================================================================
-- Migration: 011_add_document_file_size.sql
-- Purpose: Add file_size column to case_documents for displaying document sizes
-- Author: Builder Agent
-- Date: 2026-01-11
-- Version: 1.0.0
-- ============================================================================

-- Add file_size column to case_documents table
-- This stores the file size in bytes, fetched from Arweave or set during upload
ALTER TABLE case_documents
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN case_documents.file_size IS 'File size in bytes - populated from Arweave Content-Length or during upload';

-- Create index for potential filtering/sorting by file size
CREATE INDEX IF NOT EXISTS idx_case_documents_file_size
  ON case_documents(file_size)
  WHERE file_size IS NOT NULL;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  -- Verify column was added
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'case_documents'
    AND column_name = 'file_size'
  ) THEN
    RAISE EXCEPTION 'Migration failed: file_size column was not created';
  END IF;

  RAISE NOTICE 'Migration 011_add_document_file_size.sql completed successfully';
  RAISE NOTICE 'Added file_size column to case_documents table';
END $$;

-- ============================================================================
-- Rollback Script (for migration reversal if needed)
-- ============================================================================

-- To rollback this migration, run:
/*
DROP INDEX IF EXISTS idx_case_documents_file_size;
ALTER TABLE case_documents DROP COLUMN IF EXISTS file_size;
*/

-- ============================================================================
-- End of Migration
-- ============================================================================
