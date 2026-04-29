-- ============================================================================
-- MISJustice Alliance - Case Import Script
-- ============================================================================
-- Purpose: Import cases from platform-ready JSON files into PostgreSQL
-- Created: 2026-01-01
-- Author: MISJustice Alliance Archive Migration
-- Dependencies: PostgreSQL 14+, cases table must exist
-- ============================================================================

-- PREREQUISITES
-- -----------------------------------------------------------------------------
-- 1. Cases table must exist (see DEVELOPMENT_PLAN.md schema)
-- 2. A migration user must exist in the users table
-- 3. Platform-ready JSON files must be in 02-platform-ready/cases/
-- ============================================================================

BEGIN;

-- Step 1: Create migration user if doesn't exist
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  migration_user_id UUID;
BEGIN
  -- Check if migration user exists
  SELECT id INTO migration_user_id
  FROM users
  WHERE email = 'migration@misjustice.org';

  -- Create migration user if doesn't exist
  IF migration_user_id IS NULL THEN
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active)
    VALUES (
      gen_random_uuid(),
      'migration@misjustice.org',
      '', -- No password hash for system user
      'Migration',
      'System',
      'admin',
      true
    )
    RETURNING id INTO migration_user_id;

    RAISE NOTICE 'Created migration user with ID: %', migration_user_id;
  ELSE
    RAISE NOTICE 'Migration user already exists with ID: %', migration_user_id;
  END IF;
END $$;


-- Step 2: Insert Case 001 - Elvis Nuno v. E'Lise Chard et al.
-- -----------------------------------------------------------------------------
-- Generate deterministic UUID from case number using namespace UUID
-- Namespace: 6ba7b810-9dad-11d1-80b4-00c04fd430c8 (DNS namespace)
DO $$
DECLARE
  case_001_id UUID;
BEGIN
  -- Generate deterministic UUID v5 from case number
  case_001_id := uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::UUID,
    'NUNO-2015-001'
  );

  INSERT INTO cases (
    id,
    title,
    description,
    status,
    jurisdiction,
    case_type,
    date_filed,
    plaintiff_name,
    defendant_name,
    outcome,
    notes,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    case_001_id,
  'Elvis Nuno v. E''Lise Chard, Danielle Chard, YWCA Missoula, et al.',
  'Multi-jurisdictional civil rights violation case involving false prosecution, RICO conspiracy, institutional corruption, witness intimidation, and malicious prosecution spanning 2015-2025. Case includes 20+ federal and state predicate acts, multi-victim pattern evidence, and interstate coordination by law enforcement and institutional actors.',
  'open',
  'Montana, Washington (multi-jurisdictional)',
  'civil-rights, police-misconduct, rico-conspiracy, institutional-corruption',
  '2015-11-15'::DATE,
  'Elvis Nuno',
  'E''Lise Chard, Danielle Chard, YWCA Missoula, Detective Connie Brueckner, Officer Ethan Smith, et al.',
  'pending',
    'RICO treble damages calculation: $6M base damages (lost career earnings + past damages) × 3 = $18M. Case involves multi-agency coordination (Seattle PD, Edmonds PD, Missoula PD) and institutional actors (YWCA Missoula). Evidence includes 10+ victims of similar institutional patterns.',
    (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

  RAISE NOTICE 'Imported Case 001 (UUID: %): Elvis Nuno v. E''Lise Chard et al.', case_001_id;
END $$;


-- Step 3: Insert Case 002 - YWCA Institutional Corruption
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  case_002_id UUID;
BEGIN
  -- Generate deterministic UUID v5 from case number
  case_002_id := uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::UUID,
    'YWCA-RICO-2018-002'
  );

  INSERT INTO cases (
    id,
    title,
    description,
    status,
    jurisdiction,
    case_type,
    date_filed,
    plaintiff_name,
    defendant_name,
    outcome,
    notes,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    case_002_id,
  'YWCA Missoula - Institutional Corruption and RICO Enterprise Liability',
  'Institutional corruption case documenting YWCA Missoula''s role as a RICO enterprise, including governance fraud, conflicts of interest, federal grant fraud, multi-victim patterns of abuse, child endangerment, HIPAA violations, and systematic institutional dysfunction spanning 2018-2025.',
  'open',
  'Montana (Missoula County)',
  'institutional-corruption, rico-enterprise, grant-fraud, governance-violations',
  '2018-06-15'::DATE,
  'Elvis Nuno (primary complainant), Jessica Waltz (named victim), Multiple YWCA victims',
  'YWCA Missoula, YWCA Board of Directors, Detective Connie Brueckner (board member), E''Lise Chard (employee)',
  'pending',
    'Enterprise liability case under RICO statutes. Detective Brueckner''s undisclosed YWCA board membership created conflict of interest in criminal investigation. Pattern evidence includes 10+ victims documenting systematic institutional failures, October 2021 Meadowlark winter evictions of 4 families with children, HIPAA violations, and federal grant fraud allegations.',
    (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

  RAISE NOTICE 'Imported Case 002 (UUID: %): YWCA Institutional Corruption', case_002_id;
END $$;


-- Step 4: Verify imports
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  case_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO case_count FROM cases;
  RAISE NOTICE 'Total cases in database: %', case_count;

  IF case_count < 2 THEN
    RAISE WARNING 'Expected at least 2 cases, found %', case_count;
  END IF;
END $$;

-- Commit transaction
COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after import to verify success:
--
-- SELECT id, title, status, date_filed FROM cases ORDER BY date_filed;
-- SELECT * FROM cases WHERE id = '001-nuno-v-chard-et-al'::UUID;
-- SELECT * FROM cases WHERE id = '002-ywca-institutional-corruption'::UUID;
-- ============================================================================
