#!/usr/bin/env python3
"""
MISJustice Alliance - SQL Import Generator
==========================================
Generates PostgreSQL import SQL from platform-ready JSON files.

Usage:
    python generate-import-sql.py <path-to-platform-ready-json> [output-sql]
    python generate-import-sql.py --all  # Generate for all cases

Author: MISJustice Alliance Archive Migration
Created: 2026-01-01
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List


def escape_sql_string(s: str) -> str:
    """Escape single quotes for SQL"""
    if s is None:
        return ""
    return s.replace("'", "''")


def generate_case_insert(case_data: Dict[str, Any], case_id: str) -> str:
    """
    Generate SQL INSERT statement for a case

    Args:
        case_data: Case data from platform-ready JSON
        case_id: Case identifier (e.g., '001-nuno-v-chard-et-al')

    Returns:
        SQL INSERT statement
    """
    sql = f"""
-- Insert Case: {case_data.get('title', 'Unknown')}
-- -----------------------------------------------------------------------------
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
  '{case_id}'::UUID,
  '{escape_sql_string(case_data.get('title', ''))}',
  '{escape_sql_string(case_data.get('description', ''))}',
  '{escape_sql_string(case_data.get('status', 'open'))}',
  '{escape_sql_string(case_data.get('jurisdiction', ''))}',
  '{escape_sql_string(case_data.get('case_type', ''))}',
  '{case_data.get('date_filed', '2000-01-01')}'::DATE,
  '{escape_sql_string(case_data.get('plaintiff_name', ''))}',
  '{escape_sql_string(case_data.get('defendant_name', ''))}',
  '{escape_sql_string(case_data.get('outcome', ''))}',
  '{escape_sql_string(case_data.get('notes', ''))}',
  (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

RAISE NOTICE 'Imported case: {escape_sql_string(case_data.get('title', ''))}';
"""
    return sql.strip()


def generate_document_insert(case_id: str, doc: Dict[str, Any], file_size: int = 0) -> str:
    """
    Generate SQL INSERT statement for a document

    Args:
        case_id: Parent case identifier
        doc: Document metadata
        file_size: File size in bytes

    Returns:
        SQL INSERT statement
    """
    sql = f"""
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
  '{case_id}'::UUID,
  '{escape_sql_string(doc.get('filename', ''))}',
  '{escape_sql_string(doc.get('file_type', 'pdf'))}',
  {file_size},
  '{escape_sql_string(doc.get('source_path', ''))}',
  NULL,
  (SELECT id FROM users WHERE email = 'migration@misjustice.org'),
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;
"""
    return sql.strip()


def generate_sql_script(json_file: str, output_file: str = None) -> str:
    """
    Generate SQL import script from platform-ready JSON

    Args:
        json_file: Path to platform-ready JSON file
        output_file: Optional output SQL file path

    Returns:
        Path to generated SQL file
    """
    # Load JSON
    json_path = Path(json_file)
    if not json_path.exists():
        raise FileNotFoundError(f"JSON file not found: {json_file}")

    with open(json_path, "r") as f:
        data = json.load(f)

    # Extract case ID from filename (e.g., 001-nuno-v-chard-et-al.json)
    case_id = json_path.stem

    # Generate case INSERT
    case_sql = generate_case_insert(data["case"], case_id)

    # Generate document INSERTs
    doc_inserts: List[str] = []
    for doc in data.get("documents_manifest", []):
        # Try to get file size from source path
        file_size = 0
        source_path = doc.get("source_path", "")
        if source_path:
            full_path = json_path.parent.parent / source_path
            if full_path.exists():
                file_size = full_path.stat().st_size

        doc_sql = generate_document_insert(case_id, doc, file_size)
        doc_inserts.append(doc_sql)

    # Assemble full script
    script = f"""-- ============================================================================
-- MISJustice Alliance - Case Import Script
-- ============================================================================
-- Generated from: {json_path.name}
-- Case: {data['case'].get('title', 'Unknown')}
-- Documents: {len(data.get('documents_manifest', []))}
-- ============================================================================

BEGIN;

-- Step 1: Import Case
-- -----------------------------------------------------------------------------
{case_sql}


-- Step 2: Import Documents ({len(doc_inserts)})
-- -----------------------------------------------------------------------------
{chr(10).join(doc_inserts)}

RAISE NOTICE 'Imported {len(doc_inserts)} documents for case: {case_id}';


-- Step 3: Verify Import
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  doc_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO doc_count
  FROM documents
  WHERE case_id = '{case_id}'::UUID;

  RAISE NOTICE 'Total documents for case {case_id}: %', doc_count;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- SELECT * FROM cases WHERE id = '{case_id}'::UUID;
-- SELECT * FROM documents WHERE case_id = '{case_id}'::UUID;
-- ============================================================================
"""

    # Determine output path
    if output_file is None:
        # Extract case number (e.g., 001 from 001-nuno-v-chard-et-al)
        case_num = case_id.split("-")[0] if "-" in case_id else case_id
        output_file = f"02-platform-ready/migration-scripts/{case_num}-import-{case_id}.sql"

    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write SQL
    with open(output_path, "w") as f:
        f.write(script)

    print(f"✅ Generated SQL: {output_path}")
    print(f"   Case: {data['case'].get('title', 'Unknown')}")
    print(f"   Statements: 1 case + {len(doc_inserts)} documents")

    return str(output_path)


def generate_all_sql(base_dir: str = "."):
    """
    Generate SQL import scripts for all platform-ready JSON files

    Args:
        base_dir: Base directory containing 02-platform-ready/cases/
    """
    base_path = Path(base_dir)
    cases_dir = base_path / "02-platform-ready" / "cases"

    if not cases_dir.exists():
        print(f"ERROR: Directory not found: {cases_dir}")
        return

    # Find all JSON files
    json_files = list(cases_dir.glob("*.json"))

    if not json_files:
        print(f"WARNING: No JSON files found in {cases_dir}")
        return

    print(f"\nGenerating SQL import scripts for {len(json_files)} case(s)...\n")

    for json_file in json_files:
        try:
            generate_sql_script(str(json_file))
            print()
        except Exception as e:
            print(f"❌ Error processing {json_file}: {e}\n")


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python generate-import-sql.py <path-to-platform-ready-json> [output-sql]")
        print("       python generate-import-sql.py --all")
        sys.exit(1)

    if sys.argv[1] == "--all":
        generate_all_sql()
    else:
        json_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
        try:
            generate_sql_script(json_file, output_file)
        except Exception as e:
            print(f"ERROR: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
