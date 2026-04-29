-- ============================================================================
-- MISJustice Alliance - Documents Import Script
-- ============================================================================
-- Purpose: Import document references for cases into PostgreSQL
-- Created: 2026-01-01
-- Author: MISJustice Alliance Archive Migration
-- Dependencies: PostgreSQL 14+, documents table must exist, cases must be imported first
-- ============================================================================

-- PREREQUISITES
-- -----------------------------------------------------------------------------
-- 1. Documents table must exist (see DEVELOPMENT_PLAN.md schema)
-- 2. Cases must be imported (run 001-import-cases.sql first)
-- 3. Documents must be in 02-platform-ready/documents/
-- ============================================================================

BEGIN;

-- Generate case UUIDs (must match those in 001-import-cases.sql)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  case_001_id UUID;
  case_002_id UUID;
BEGIN
  -- Generate deterministic UUIDs from case numbers
  case_001_id := uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::UUID,
    'NUNO-2015-001'
  );

  case_002_id := uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::UUID,
    'YWCA-RICO-2018-002'
  );

  RAISE NOTICE 'Using Case 001 UUID: %', case_001_id;
  RAISE NOTICE 'Using Case 002 UUID: %', case_002_id;

  -- Store in temporary table for use in INSERT statements
  CREATE TEMP TABLE IF NOT EXISTS temp_case_uuids (
    case_number TEXT PRIMARY KEY,
    case_id UUID NOT NULL
  );

  INSERT INTO temp_case_uuids (case_number, case_id)
  VALUES
    ('NUNO-2015-001', case_001_id),
    ('YWCA-RICO-2018-002', case_002_id)
  ON CONFLICT (case_number) DO UPDATE SET case_id = EXCLUDED.case_id;
END $$;


-- Step 1: Import documents for Case 001 - Nuno v. Chard et al.
-- -----------------------------------------------------------------------------

-- Case Summary
INSERT INTO documents (
  id,
  case_id,
  filename,
  file_type,
  file_size_bytes,
  storage_path,
  arweave_tx_id,
  uploaded_by,
  created_at
)
VALUES (
  gen_random_uuid(),
  (SELECT case_id FROM temp_case_uuids WHERE case_number = 'NUNO-2015-001'),
  '01_Case_Summary.pdf',
  'pdf',
  86016, -- 84KB
  '02-platform-ready/documents/nuno-case/01_Case_Summary.pdf',
  NULL, -- To be populated after Arweave upload
  (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- FBI Civil Rights Cover Letter
INSERT INTO documents (
  id,
  case_id,
  filename,
  file_type,
  file_size_bytes,
  storage_path,
  arweave_tx_id,
  uploaded_by,
  created_at
)
VALUES (
  gen_random_uuid(),
  (SELECT case_id FROM temp_case_uuids WHERE case_number = 'NUNO-2015-001'),
  '02_FBI_Civil_Rights_Cover_Letter.pdf',
  'pdf',
  69632, -- 68KB
  '02-platform-ready/documents/nuno-case/02_FBI_Civil_Rights_Cover_Letter.pdf',
  NULL,
  (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Montana AG Cover Letter
INSERT INTO documents (
  id,
  case_id,
  filename,
  file_type,
  file_size_bytes,
  storage_path,
  arweave_tx_id,
  uploaded_by,
  created_at
)
VALUES (
  gen_random_uuid(),
  (SELECT case_id FROM temp_case_uuids WHERE case_number = 'NUNO-2015-001'),
  '03_Montana_AG_Cover_Letter.pdf',
  'pdf',
  46080, -- 45KB
  '02-platform-ready/documents/nuno-case/03_Montana_AG_Cover_Letter.pdf',
  NULL,
  (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Washington AG Cover Letter
INSERT INTO documents (
  id,
  case_id,
  filename,
  file_type,
  file_size_bytes,
  storage_path,
  arweave_tx_id,
  uploaded_by,
  created_at
)
VALUES (
  gen_random_uuid(),
  (SELECT case_id FROM temp_case_uuids WHERE case_number = 'NUNO-2015-001'),
  '04_Washington_AG_Cover_Letter.pdf',
  'pdf',
  45056, -- 44KB
  '02-platform-ready/documents/nuno-case/04_Washington_AG_Cover_Letter.pdf',
  NULL,
  (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- USAO Montana Cover Letter
INSERT INTO documents (
  id,
  case_id,
  filename,
  file_type,
  file_size_bytes,
  storage_path,
  arweave_tx_id,
  uploaded_by,
  created_at
)
VALUES (
  gen_random_uuid(),
  (SELECT case_id FROM temp_case_uuids WHERE case_number = 'NUNO-2015-001'),
  '05_USAO_Montana_Cover_Letter.pdf',
  'pdf',
  47104, -- 46KB
  '02-platform-ready/documents/nuno-case/05_USAO_Montana_Cover_Letter.pdf',
  NULL,
  (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Danielle Chard Criminal Report
INSERT INTO documents (
  id,
  case_id,
  filename,
  file_type,
  file_size_bytes,
  storage_path,
  arweave_tx_id,
  uploaded_by,
  created_at
)
VALUES (
  gen_random_uuid(),
  (SELECT case_id FROM temp_case_uuids WHERE case_number = 'NUNO-2015-001'),
  '06_Danielle_Chard_Criminal_Report.pdf',
  'pdf',
  48128, -- 47KB
  '02-platform-ready/documents/nuno-case/06_Danielle_Chard_Criminal_Report.pdf',
  NULL,
  (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Comprehensive Evidentiary Documentation
INSERT INTO documents (
  id,
  case_id,
  filename,
  file_type,
  file_size_bytes,
  storage_path,
  arweave_tx_id,
  uploaded_by,
  created_at
)
VALUES (
  gen_random_uuid(),
  (SELECT case_id FROM temp_case_uuids WHERE case_number = 'NUNO-2015-001'),
  '10_Comprehensive_Evidentiary_Documentation.pdf',
  'pdf',
  313344, -- 306KB
  '02-platform-ready/documents/nuno-case/10_Comprehensive_Evidentiary_Documentation.pdf',
  NULL,
  (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- YWCA Institutional Corruption Supplemental
INSERT INTO documents (
  id,
  case_id,
  filename,
  file_type,
  file_size_bytes,
  storage_path,
  arweave_tx_id,
  uploaded_by,
  created_at
)
VALUES (
  gen_random_uuid(),
  (SELECT case_id FROM temp_case_uuids WHERE case_number = 'NUNO-2015-001'),
  '11.1_YWCA_Institutional_Corruption_Supplemental.pdf',
  'pdf',
  95232, -- 93KB
  '02-platform-ready/documents/nuno-case/11.1_YWCA_Institutional_Corruption_Supplemental.pdf',
  NULL,
  (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Elvis Nuno Sworn Declaration
INSERT INTO documents (
  id,
  case_id,
  filename,
  file_type,
  file_size_bytes,
  storage_path,
  arweave_tx_id,
  uploaded_by,
  created_at
)
VALUES (
  gen_random_uuid(),
  (SELECT case_id FROM temp_case_uuids WHERE case_number = 'NUNO-2015-001'),
  '11.2_Elvis_Nuno_Sworn_Declaration.pdf',
  'pdf',
  143360, -- 140KB
  '02-platform-ready/documents/nuno-case/11.2_Elvis_Nuno_Sworn_Declaration.pdf',
  NULL,
  (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE 'Imported 9 documents for Case 001';
END $$;


-- Step 2: Import documents for Case 002 - YWCA Institutional Corruption
-- -----------------------------------------------------------------------------

-- YWCA Institutional RICO Dossier
INSERT INTO documents (
  id,
  case_id,
  filename,
  file_type,
  file_size_bytes,
  storage_path,
  arweave_tx_id,
  uploaded_by,
  created_at
)
VALUES (
  gen_random_uuid(),
  (SELECT case_id FROM temp_case_uuids WHERE case_number = 'YWCA-RICO-2018-002'),
  'YWCA-Institutional-RICO-Dossier.pdf',
  'pdf',
  846848, -- 827KB
  '02-platform-ready/documents/ywca-rico/YWCA-Institutional-RICO-Dossier.pdf',
  NULL,
  (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- YWCA Expanded Evidence Compilation
INSERT INTO documents (
  id,
  case_id,
  filename,
  file_type,
  file_size_bytes,
  storage_path,
  arweave_tx_id,
  uploaded_by,
  created_at
)
VALUES (
  gen_random_uuid(),
  (SELECT case_id FROM temp_case_uuids WHERE case_number = 'YWCA-RICO-2018-002'),
  'YWCA-Expanded-Evidence-Compilation.pdf',
  'pdf',
  174080, -- 170KB
  '02-platform-ready/documents/ywca-rico/YWCA-Expanded-Evidence-Compilation.pdf',
  NULL,
  (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE 'Imported 2 documents for Case 002';
END $$;


-- Step 3: Verify imports
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  doc_count INTEGER;
  case_001_docs INTEGER;
  case_002_docs INTEGER;
BEGIN
  -- Total document count
  SELECT COUNT(*) INTO doc_count FROM documents;
  RAISE NOTICE 'Total documents in database: %', doc_count;

  -- Case 001 document count
  SELECT COUNT(*) INTO case_001_docs
  FROM documents
  WHERE case_id = (SELECT case_id FROM temp_case_uuids WHERE case_number = 'NUNO-2015-001');
  RAISE NOTICE 'Documents for Case 001: %', case_001_docs;

  -- Case 002 document count
  SELECT COUNT(*) INTO case_002_docs
  FROM documents
  WHERE case_id = (SELECT case_id FROM temp_case_uuids WHERE case_number = 'YWCA-RICO-2018-002');
  RAISE NOTICE 'Documents for Case 002: %', case_002_docs;

  IF case_001_docs < 9 THEN
    RAISE WARNING 'Expected 9 documents for Case 001, found %', case_001_docs;
  END IF;

  IF case_002_docs < 2 THEN
    RAISE WARNING 'Expected 2 documents for Case 002, found %', case_002_docs;
  END IF;
END $$;

-- Commit transaction
COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after import to verify success:
--
-- SELECT case_id, filename, file_type, file_size_bytes
-- FROM documents
-- ORDER BY case_id, filename;
--
-- SELECT c.title, COUNT(d.id) as document_count
-- FROM cases c
-- LEFT JOIN documents d ON c.id = d.case_id
-- GROUP BY c.id, c.title
-- ORDER BY c.title;
-- ============================================================================
