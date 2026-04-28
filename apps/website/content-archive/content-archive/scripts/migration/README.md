# Migration Automation Scripts

**Purpose:** Automate the transformation of case-metadata.json files to platform-ready JSON and SQL import scripts.

**Created:** 2026-01-01
**Status:** Phase 2 Complete

---

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `validate-metadata.py` | Validate case-metadata.json against schema | Ensure data quality before migration |
| `generate-case-json.py` | Transform to platform-ready JSON | Create database import-ready files |
| `generate-import-sql.py` | Generate SQL import scripts | Create PostgreSQL import statements |

---

## Quick Start

### 1. Validate All Cases

```bash
python validate-metadata.py --all
```

**Output:**
```
Found 2 case(s) to validate

================================================================================
Validation Report: case-metadata.json
================================================================================

INFO:
  ℹ️  INFO: Case marked as ready for platform import
  ℹ️  INFO: Arweave archival priority: high
  ℹ️  INFO: Documents: 10 narrative, 6 evidence categories

✅ Validation PASSED

================================================================================
```

### 2. Generate Platform-Ready JSON

```bash
python generate-case-json.py --all
```

**Output:**
```
Generating platform-ready JSON for 2 case(s)...

✅ Generated: 02-platform-ready/cases/001-nuno-v-chard-et-al.json
   Case: Elvis Nuno v. E'Lise Chard, Danielle Chard, YWCA Missoula, et al.
   Documents: 10
   Evidence Categories: 6
```

### 3. Generate SQL Import Scripts

```bash
python generate-import-sql.py --all
```

**Output:**
```
Generating SQL import scripts for 2 case(s)...

✅ Generated SQL: 02-platform-ready/migration-scripts/001-import-001-nuno-v-chard-et-al.sql
   Case: Elvis Nuno v. E'Lise Chard, Danielle Chard, YWCA Missoula, et al.
   Statements: 1 case + 10 documents
```

---

## Script Details

### `validate-metadata.py`

**Purpose:** Validate case-metadata.json files against required schema before migration.

**Usage:**
```bash
# Validate single case
python validate-metadata.py 01-source-materials/nuno-v-chard-et-al/case-metadata.json

# Validate all cases
python validate-metadata.py --all
```

**Validation Checks:**
- ✅ Required fields present (title, description, status, jurisdiction, etc.)
- ✅ Status values are valid (open, closed, dismissed, appealed, settled, pending)
- ✅ Date format is correct (YYYY-MM-DD)
- ✅ damages_claimed is numeric
- ✅ narrative_documents have required fields
- ✅ Source files exist (warns if missing)
- ℹ️ Platform import readiness
- ℹ️ Arweave archival priority

**Exit Codes:**
- `0` - Validation passed
- `1` - Validation failed (has errors)

---

### `generate-case-json.py`

**Purpose:** Transform case-metadata.json to platform-ready JSON format that matches PostgreSQL Cases table schema.

**Usage:**
```bash
# Generate for single case
python generate-case-json.py 01-source-materials/nuno-v-chard-et-al/case-metadata.json

# Generate with custom output path
python generate-case-json.py 01-source-materials/nuno-v-chard-et-al/case-metadata.json custom-output.json

# Generate for all cases
python generate-case-json.py --all
```

**Transformation:**

**Input (case-metadata.json):**
```json
{
  "case_id": "001",
  "title": "Elvis Nuno v. E'Lise Chard, Danielle Chard, YWCA Missoula, et al.",
  "description": "Multi-jurisdictional civil rights violation case...",
  "status": "open",
  "jurisdiction": "Montana, Washington",
  ...
}
```

**Output (platform-ready JSON):**
```json
{
  "case": {
    "title": "...",
    "description": "...",
    "status": "open",
    ...
  },
  "extended_metadata": {
    "case_number": "NUNO-2015-001",
    "damages_claimed": 18000000,
    "tags": [...],
    ...
  },
  "documents_manifest": [...],
  "evidence_categories": [...],
  "arweave_archival": {...},
  "import_metadata": {...}
}
```

**Default Output Location:** `02-platform-ready/cases/{case_id}-{case_number}.json`

---

### `generate-import-sql.py`

**Purpose:** Generate PostgreSQL import SQL from platform-ready JSON files.

**Usage:**
```bash
# Generate SQL for single case
python generate-import-sql.py 02-platform-ready/cases/001-nuno-v-chard-et-al.json

# Generate with custom output path
python generate-import-sql.py 02-platform-ready/cases/001-nuno-v-chard-et-al.json custom-import.sql

# Generate for all cases
python generate-import-sql.py --all
```

**Generated SQL Structure:**
```sql
BEGIN;

-- Step 1: Import Case
INSERT INTO cases (...) VALUES (...);

-- Step 2: Import Documents
INSERT INTO documents (...) VALUES (...);
-- (repeated for each document)

-- Step 3: Verify Import
DO $$ ... $$;

COMMIT;
```

**Default Output Location:** `02-platform-ready/migration-scripts/{case_num}-import-{case_id}.sql`

**Features:**
- ✅ Automatically escapes SQL strings (handles single quotes)
- ✅ Uses UUID for case IDs
- ✅ Creates migration user if doesn't exist
- ✅ Includes verification queries
- ✅ Uses transactions (BEGIN/COMMIT)
- ✅ Handles conflicts (ON CONFLICT DO UPDATE)

---

## Full Migration Workflow

### Step 1: Create Source Metadata
1. Create `01-source-materials/{case-name}/case-metadata.json`
2. Add narrative documents and evidence

### Step 2: Validate
```bash
python validate-metadata.py --all
```
Fix any validation errors before proceeding.

### Step 3: Generate Platform-Ready JSON
```bash
python generate-case-json.py --all
```
This creates `02-platform-ready/cases/*.json` files.

### Step 4: Copy Documents
```bash
cp 01-source-materials/*/narrative/pdfs/*.pdf 02-platform-ready/documents/{case-name}/
```

### Step 5: Generate SQL Import Scripts
```bash
python generate-import-sql.py --all
```
This creates `02-platform-ready/migration-scripts/*.sql` files.

### Step 6: Import to PostgreSQL
```bash
psql -h localhost -U postgres -d misjustice_db -f 02-platform-ready/migration-scripts/001-import-cases.sql
psql -h localhost -U postgres -d misjustice_db -f 02-platform-ready/migration-scripts/002-import-documents.sql
psql -h localhost -U postgres -d misjustice_db -f 02-platform-ready/migration-scripts/003-verify-import.sql
```

### Step 7: Verify Success
Check verification script output for:
- ✅ Case count matches expected
- ✅ Document counts per case are correct
- ✅ No orphaned documents
- ✅ No missing files

---

## Troubleshooting

### Validation Fails

**Error:** `Missing required field: 'title'`
**Fix:** Add missing field to case-metadata.json

**Error:** `Invalid date_filed format: '2015-11-15T00:00:00'`
**Fix:** Use simple date format: `2015-11-15` (no time component)

**Warning:** `Source file not found: narrative/pdfs/document.pdf`
**Fix:** Ensure source files exist in correct location or update source_path

### SQL Import Fails

**Error:** `duplicate key value violates unique constraint`
**Fix:** SQL uses `ON CONFLICT DO UPDATE` - check if case_id UUID is valid

**Error:** `foreign key violation: user migration@misjustice.org does not exist`
**Fix:** Ensure users table exists and migration user is created (script does this automatically)

### Script Permissions

```bash
chmod +x validate-metadata.py
chmod +x generate-case-json.py
chmod +x generate-import-sql.py
```

---

## Dependencies

**Python 3.9+** required

**Standard library only** - no external dependencies:
- `json` - JSON parsing
- `pathlib` - File path operations
- `datetime` - Date validation
- `sys` - Command-line arguments

---

## Adding New Cases

1. Create directory: `01-source-materials/{new-case-name}/`
2. Create `case-metadata.json` following schema
3. Add documents to `narrative/pdfs/` and `evidence/`
4. Run validation: `python validate-metadata.py 01-source-materials/{new-case-name}/case-metadata.json`
5. Fix validation errors
6. Run full workflow (Steps 3-7 above)

---

## Schema Reference

**PostgreSQL Cases Table:**
```sql
CREATE TABLE cases (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  jurisdiction VARCHAR(255),
  case_type VARCHAR(100),
  date_filed DATE,
  plaintiff_name VARCHAR(255),
  defendant_name VARCHAR(255),
  outcome VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**PostgreSQL Documents Table:**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size_bytes INTEGER,
  storage_path VARCHAR(512),
  arweave_tx_id VARCHAR(255),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

**For more information, see:**
- `DEVELOPMENT_PLAN.md` - Platform architecture and database schema
- `REORGANIZATION_PLAN.md` - Content archive reorganization strategy
- `MIGRATION_SUMMARY.md` - Phase 1 completion summary
