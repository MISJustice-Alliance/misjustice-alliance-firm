-- ============================================================================
-- Migration: 001_create_legal_cases.sql
-- Purpose: Create legal case management schema for MISJustice Alliance
-- Author: Phase 1 Implementation
-- Date: 2026-01-01
-- Version: 1.0.0
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Table: legal_cases
-- Purpose: Main table for storing legal case records
-- ============================================================================

CREATE TABLE IF NOT EXISTS legal_cases (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR(255) UNIQUE NOT NULL,

  -- Party information
  plaintiff VARCHAR(255) NOT NULL,
  plaintiff_anon VARCHAR(255), -- Anonymized version for public display
  defendant VARCHAR(255) NOT NULL,

  -- Jurisdiction and filing
  jurisdiction VARCHAR(255) NOT NULL,
  filed_date DATE,

  -- Case status tracking
  status VARCHAR(50) DEFAULT 'intake' CHECK (status IN (
    'intake',           -- Initial case intake
    'research',         -- Legal research phase
    'pleadings',        -- Drafting/filing complaints
    'discovery',        -- Discovery process
    'motions',          -- Motion practice
    'trial',            -- Trial preparation/execution
    'appeal',           -- Appellate process
    'settled',          -- Case settled
    'closed'            -- Case closed/resolved
  )),

  -- Legal theories and facts
  causes_of_action TEXT[], -- Array of legal theories (e.g., '§1983', 'ADA', 'state tort')
  case_facts TEXT,         -- Narrative description of facts

  -- Arweave archival tracking
  arweave_tx_ids JSONB DEFAULT '[]'::jsonb, -- Array of Arweave TX IDs for archived documents

  -- Audit timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE legal_cases IS 'Main legal case records for MISJustice Alliance advocacy platform';
COMMENT ON COLUMN legal_cases.plaintiff_anon IS 'Anonymized plaintiff name for public transparency while protecting identity';
COMMENT ON COLUMN legal_cases.arweave_tx_ids IS 'JSON array of Arweave transaction IDs for permanent document archival';

-- ============================================================================
-- Table: case_documents
-- Purpose: Track documents associated with legal cases
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_documents (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES legal_cases(id) ON DELETE CASCADE,

  -- Document metadata
  document_type VARCHAR(100) NOT NULL CHECK (document_type IN (
    'complaint',        -- Initial complaint/petition
    'motion',           -- Motion filings
    'brief',            -- Legal brief
    'memo',             -- Research memorandum
    'discovery',        -- Discovery documents
    'evidence',         -- Evidence files
    'ruling',           -- Court rulings/orders
    'settlement',       -- Settlement agreements
    'other'             -- Other document types
  )),
  document_name VARCHAR(255) NOT NULL,

  -- File storage
  file_path TEXT,              -- Local file system path (temporary)
  arweave_tx_id VARCHAR(255),  -- Permanent Arweave transaction ID
  document_hash VARCHAR(64),   -- SHA-256 hash for integrity verification

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE case_documents IS 'Documents associated with legal cases (complaints, motions, evidence, etc.)';
COMMENT ON COLUMN case_documents.document_hash IS 'SHA-256 hash of document content for integrity verification';

-- ============================================================================
-- Table: case_archives
-- Purpose: Track Arweave archival operations for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_archives (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES legal_cases(id) ON DELETE CASCADE,

  -- Archival metadata
  stage VARCHAR(50) NOT NULL CHECK (stage IN (
    'intake',           -- Initial case analysis archived
    'research',         -- Research memo archived
    'pleadings',        -- Complaint/pleadings archived
    'discovery',        -- Discovery documents archived
    'trial',            -- Trial materials archived
    'final'             -- Final comprehensive archive
  )),
  arweave_tx_id VARCHAR(255) NOT NULL,
  document_hash VARCHAR(64) NOT NULL,

  -- Verification status
  archived_at TIMESTAMP DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,

  -- Metadata
  bundle_metadata JSONB DEFAULT '{}'::jsonb -- Additional bundle information
);

COMMENT ON TABLE case_archives IS 'Audit trail for Arweave archival operations with verification tracking';
COMMENT ON COLUMN case_archives.stage IS 'Case lifecycle stage when archival occurred';
COMMENT ON COLUMN case_archives.verified IS 'Whether archive integrity has been verified';

-- ============================================================================
-- Indexes for Query Performance
-- ============================================================================

-- Case lookup indexes
CREATE INDEX IF NOT EXISTS idx_legal_cases_status
  ON legal_cases(status);

CREATE INDEX IF NOT EXISTS idx_legal_cases_jurisdiction
  ON legal_cases(jurisdiction);

CREATE INDEX IF NOT EXISTS idx_legal_cases_filed_date
  ON legal_cases(filed_date DESC);

CREATE INDEX IF NOT EXISTS idx_legal_cases_created_at
  ON legal_cases(created_at DESC);

-- Full-text search on case facts (useful for case search)
CREATE INDEX IF NOT EXISTS idx_legal_cases_facts_search
  ON legal_cases USING GIN (to_tsvector('english', case_facts));

-- Document lookup indexes
CREATE INDEX IF NOT EXISTS idx_case_documents_case_id
  ON case_documents(case_id);

CREATE INDEX IF NOT EXISTS idx_case_documents_type
  ON case_documents(document_type);

CREATE INDEX IF NOT EXISTS idx_case_documents_arweave_tx
  ON case_documents(arweave_tx_id)
  WHERE arweave_tx_id IS NOT NULL;

-- Archive lookup indexes
CREATE INDEX IF NOT EXISTS idx_case_archives_case_id
  ON case_archives(case_id);

CREATE INDEX IF NOT EXISTS idx_case_archives_stage
  ON case_archives(stage);

CREATE INDEX IF NOT EXISTS idx_case_archives_arweave_tx
  ON case_archives(arweave_tx_id);

-- ============================================================================
-- Triggers for Automatic Timestamp Updates
-- ============================================================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to legal_cases table
DROP TRIGGER IF EXISTS update_legal_cases_updated_at ON legal_cases;
CREATE TRIGGER update_legal_cases_updated_at
  BEFORE UPDATE ON legal_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Verification and Testing Queries
-- ============================================================================

-- Verify tables created
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables
          WHERE table_name IN ('legal_cases', 'case_documents', 'case_archives')) = 3,
         'Not all tables were created successfully';

  RAISE NOTICE 'Migration 001_create_legal_cases.sql completed successfully';
  RAISE NOTICE 'Tables created: legal_cases, case_documents, case_archives';
  RAISE NOTICE 'Indexes created: 11 indexes for query optimization';
END $$;

-- ============================================================================
-- Sample Data (Optional - for testing only)
-- ============================================================================

-- Uncomment below to insert sample test data
/*
INSERT INTO legal_cases (
  case_number,
  plaintiff,
  plaintiff_anon,
  defendant,
  jurisdiction,
  filed_date,
  status,
  causes_of_action,
  case_facts
) VALUES (
  'TEST-001-2026',
  'John Doe',
  'J.D.',
  'City Police Department',
  'U.S. District Court - Northern District of California',
  '2026-01-01',
  'intake',
  ARRAY['42 U.S.C. § 1983', 'Fourth Amendment - Excessive Force'],
  'On December 15, 2025, plaintiff was subjected to excessive force during arrest. Officers used taser without provocation while plaintiff was compliant. Incident captured on body camera. Plaintiff sustained physical injuries requiring medical treatment.'
);

-- Verify sample data inserted
SELECT
  case_number,
  plaintiff_anon,
  status,
  causes_of_action
FROM legal_cases
WHERE case_number = 'TEST-001-2026';
*/

-- ============================================================================
-- Rollback Script (for migration reversal if needed)
-- ============================================================================

-- To rollback this migration, run:
/*
DROP TRIGGER IF EXISTS update_legal_cases_updated_at ON legal_cases;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS case_archives CASCADE;
DROP TABLE IF EXISTS case_documents CASCADE;
DROP TABLE IF EXISTS legal_cases CASCADE;
*/

-- ============================================================================
-- End of Migration
-- ============================================================================
