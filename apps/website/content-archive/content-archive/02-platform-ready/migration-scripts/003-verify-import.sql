-- ============================================================================
-- MISJustice Alliance - Import Verification Script
-- ============================================================================
-- Purpose: Verify successful import of cases and documents
-- Created: 2026-01-01
-- Author: MISJustice Alliance Archive Migration
-- Usage: Run after 001-import-cases.sql and 002-import-documents.sql
-- ============================================================================

\echo '============================================================================'
\echo 'IMPORT VERIFICATION REPORT'
\echo '============================================================================'
\echo ''

-- Check 1: Users table
\echo '1. USERS TABLE'
\echo '--------------------------------------------------------------------------'
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE email = 'migration@misjustice.org') as migration_users
FROM users;
\echo ''

-- Check 2: Cases table
\echo '2. CASES TABLE'
\echo '--------------------------------------------------------------------------'
SELECT
  id,
  title,
  status,
  jurisdiction,
  date_filed,
  created_at
FROM cases
ORDER BY date_filed;
\echo ''

-- Check 3: Documents table
\echo '3. DOCUMENTS TABLE'
\echo '--------------------------------------------------------------------------'
SELECT
  case_id,
  filename,
  file_type,
  ROUND(file_size_bytes / 1024.0, 2) as size_kb,
  storage_path
FROM documents
ORDER BY case_id, filename;
\echo ''

-- Check 4: Document counts per case
\echo '4. DOCUMENT COUNTS BY CASE'
\echo '--------------------------------------------------------------------------'
SELECT
  c.id as case_id,
  c.title,
  COUNT(d.id) as document_count,
  SUM(d.file_size_bytes) as total_size_bytes,
  ROUND(SUM(d.file_size_bytes) / 1024.0 / 1024.0, 2) as total_size_mb
FROM cases c
LEFT JOIN documents d ON c.id = d.case_id
GROUP BY c.id, c.title
ORDER BY c.id;
\echo ''

-- Check 5: Missing arweave_tx_id (documents not yet archived)
\echo '5. DOCUMENTS PENDING ARWEAVE ARCHIVAL'
\echo '--------------------------------------------------------------------------'
SELECT
  c.title as case_title,
  d.filename,
  d.storage_path
FROM documents d
JOIN cases c ON d.case_id = c.id
WHERE d.arweave_tx_id IS NULL
ORDER BY c.title, d.filename;
\echo ''

-- Check 6: Data integrity checks
\echo '6. DATA INTEGRITY CHECKS'
\echo '--------------------------------------------------------------------------'
DO $$
DECLARE
  orphaned_docs INTEGER;
  missing_case_files INTEGER;
  case_001_uuid UUID;
  case_002_uuid UUID;
BEGIN
  -- Generate deterministic UUIDs to match import scripts
  case_001_uuid := uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::UUID,
    'NUNO-2015-001'
  );

  case_002_uuid := uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::UUID,
    'YWCA-RICO-2018-002'
  );

  -- Check for orphaned documents (case_id doesn't exist)
  SELECT COUNT(*) INTO orphaned_docs
  FROM documents d
  WHERE NOT EXISTS (SELECT 1 FROM cases c WHERE c.id = d.case_id);

  IF orphaned_docs > 0 THEN
    RAISE WARNING 'Found % orphaned documents (case_id doesn''t exist)', orphaned_docs;
  ELSE
    RAISE NOTICE '✓ No orphaned documents found';
  END IF;

  -- Check expected document counts
  SELECT COUNT(*) INTO missing_case_files
  FROM (
    VALUES
      (case_001_uuid, 9),
      (case_002_uuid, 2)
  ) AS expected(case_id, expected_count)
  LEFT JOIN (
    SELECT case_id, COUNT(*) as actual_count
    FROM documents
    GROUP BY case_id
  ) AS actual ON expected.case_id = actual.case_id
  WHERE COALESCE(actual.actual_count, 0) < expected.expected_count;

  IF missing_case_files > 0 THEN
    RAISE WARNING 'Some cases have fewer documents than expected';
  ELSE
    RAISE NOTICE '✓ All cases have expected document counts';
  END IF;
END $$;
\echo ''

-- Check 7: Summary statistics
\echo '7. SUMMARY STATISTICS'
\echo '--------------------------------------------------------------------------'
SELECT
  'Total Cases' as metric,
  COUNT(*)::TEXT as value
FROM cases
UNION ALL
SELECT
  'Total Documents',
  COUNT(*)::TEXT
FROM documents
UNION ALL
SELECT
  'Total Storage Size (MB)',
  ROUND(SUM(file_size_bytes) / 1024.0 / 1024.0, 2)::TEXT
FROM documents
UNION ALL
SELECT
  'Documents Awaiting Arweave Upload',
  COUNT(*)::TEXT
FROM documents
WHERE arweave_tx_id IS NULL;
\echo ''

\echo '============================================================================'
\echo 'VERIFICATION COMPLETE'
\echo '============================================================================'

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- Total Cases: 2
-- Total Documents: 11 (9 for Case 001, 2 for Case 002)
-- All documents should have arweave_tx_id = NULL initially
-- No orphaned documents
-- All expected document counts met
-- ============================================================================
