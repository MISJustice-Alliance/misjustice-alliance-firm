-- Migration: Add synopsis and tags fields to case_documents
-- Purpose: Store AI-generated document descriptions and metadata tags

-- Add synopsis column for document description
ALTER TABLE case_documents
  ADD COLUMN IF NOT EXISTS synopsis TEXT;

-- Add tags column as PostgreSQL array for metadata tags
ALTER TABLE case_documents
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create GIN index for efficient tag searches
CREATE INDEX IF NOT EXISTS idx_case_documents_tags
  ON case_documents USING GIN (tags);

-- Create index for finding documents without synopsis (for backfill)
CREATE INDEX IF NOT EXISTS idx_case_documents_pending_analysis
  ON case_documents (created_at)
  WHERE synopsis IS NULL;

COMMENT ON COLUMN case_documents.synopsis IS 'AI-generated 1-2 sentence description of document contents';
COMMENT ON COLUMN case_documents.tags IS 'Array of metadata tags categorizing the document';
