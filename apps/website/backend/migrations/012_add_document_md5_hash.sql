-- Migration: 012_add_document_md5_hash.sql
-- Description: Add MD5 hash column for file integrity verification
-- This enables users to verify downloaded files match the archived versions

-- Add MD5 hash column (32 characters for hex-encoded MD5)
ALTER TABLE case_documents
ADD COLUMN IF NOT EXISTS md5_hash VARCHAR(32) DEFAULT NULL;

-- Add index for potential duplicate detection
CREATE INDEX IF NOT EXISTS idx_case_documents_md5_hash
  ON case_documents(md5_hash)
  WHERE md5_hash IS NOT NULL;

-- Add comment documenting the column purpose
COMMENT ON COLUMN case_documents.md5_hash IS
  'MD5 hash of the document file for integrity verification. Allows users to verify downloaded files match archived versions.';
