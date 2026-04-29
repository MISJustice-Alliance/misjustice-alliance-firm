# Content Archive Reorganization Plan

**Date:** January 1, 2026
**Purpose:** Align content-archive structure with MISJustice Alliance platform architecture
**Status:** Proposal - Awaiting Approval

---

## Executive Summary

The current content-archive/ directory contains comprehensive legal case materials organized primarily by **document format** (LaTeX, Markdown, PDF). To support the platform's database-driven architecture described in DEVELOPMENT_PLAN.md, we need to reorganize the content to align with the **PostgreSQL schema** (Cases, Documents, Users) and create a clear **data migration pipeline** to the platform.

---

## Current Structure Analysis

### Current Organization (Format-Centric)
```
content-archive/
├── markdown/          # Organized by format
├── latex/             # Organized by format
├── pdfs/              # Organized by format
├── evidentiary-documentation/  # Mixed organization
├── legal/             # Templates and standards
└── scripts/           # Conversion utilities
```

### Problems with Current Structure

1. **No Database Alignment:** Structure doesn't map to Cases/Documents schema
2. **Duplication:** Same content in 3 formats (LaTeX, Markdown, PDF)
3. **Unclear Migration Path:** How do these files become database records?
4. **Mixed Concerns:** Source materials mixed with published outputs
5. **No Case Metadata:** No structured JSON matching database schema
6. **Evidence Organization:** Evidence scattered across formats

---

## Proposed Structure (Platform-Aligned)

### New Organization (Case-Centric)

```
content-archive/
│
├── README.md                    # Updated guide
├── CHANGELOG.md                 # Version history
├── REORGANIZATION_PLAN.md       # This file
│
├── 01-source-materials/         # Original evidentiary docs (PRESERVE)
│   │
│   ├── nuno-v-chard-et-al/     # Primary case
│   │   ├── case-metadata.json   # Structured metadata (DB import ready)
│   │   ├── narrative/           # Case narrative documents
│   │   │   ├── latex/           # Source .tex files
│   │   │   ├── markdown/        # Converted .md files
│   │   │   └── pdfs/            # Compiled PDFs
│   │   ├── evidence/            # Supporting documents
│   │   │   ├── court-documents/
│   │   │   ├── formal-complaints/
│   │   │   ├── police-reports/
│   │   │   └── witness-statements/
│   │   └── legal-analysis/      # Legal memos, briefs
│   │       ├── constitutional-violations.md
│   │       ├── rico-analysis.md
│   │       └── damages-calculation.md
│   │
│   ├── ywca-institutional-corruption/  # Related case
│   │   ├── case-metadata.json
│   │   ├── narrative/
│   │   │   ├── latex/
│   │   │   ├── markdown/
│   │   │   └── pdfs/
│   │   ├── evidence/
│   │   │   ├── financial-records/
│   │   │   ├── governance-documents/
│   │   │   └── victim-accounts/
│   │   └── legal-analysis/
│   │
│   └── templates/              # Reusable templates
│       ├── cover-letter-template.txt
│       ├── legal-brief-template.tex
│       └── sworn-declaration-template.tex
│
├── 02-platform-ready/          # Data formatted for platform import
│   │
│   ├── cases/                  # JSON files matching PostgreSQL Cases table
│   │   ├── 001-nuno-v-chard-et-al.json
│   │   └── 002-ywca-institutional-corruption.json
│   │
│   ├── documents/              # Files to upload to platform
│   │   ├── nuno-case/
│   │   │   ├── executive-summary.pdf
│   │   │   ├── sworn-declaration.pdf
│   │   │   ├── evidence-001-court-dismissal.pdf
│   │   │   └── [...]
│   │   └── ywca-rico/
│   │       ├── institutional-analysis.pdf
│   │       └── [...]
│   │
│   ├── users/                  # User accounts for platform (optional)
│   │   └── initial-users.json
│   │
│   └── migration-scripts/      # SQL for importing to PostgreSQL
│       ├── 001-import-cases.sql
│       ├── 002-import-documents.sql
│       └── 003-verify-import.sql
│
├── 03-published-outputs/       # Compiled packets for distribution
│   │
│   ├── criminal-referral-packet/  # For law enforcement
│   │   ├── README.md
│   │   ├── 01-executive-summary.pdf
│   │   ├── 02-fbi-cover-letter.pdf
│   │   ├── 03-montana-ag-cover-letter.pdf
│   │   └── [...]
│   │
│   ├── civil-litigation-packet/   # For attorneys
│   │   ├── README.md
│   │   ├── complaint-draft.pdf
│   │   ├── evidence-index.pdf
│   │   └── [...]
│   │
│   └── public-documentation/      # For Arweave publication
│       ├── README.md
│       ├── case-summary.md
│       └── redacted-evidence/
│
└── scripts/                    # Automation tools
    ├── conversion/             # Format conversion (LaTeX → Markdown)
    │   ├── latex_to_markdown.py
    │   ├── latex_to_markdown.sh
    │   └── latex_to_markdown_fixed.sh
    │
    ├── migration/              # Source → Platform-ready
    │   ├── generate-case-json.py
    │   ├── generate-import-sql.py
    │   └── validate-metadata.py
    │
    └── publishing/             # Platform → Arweave
        ├── bundle-for-arweave.py
        └── verify-integrity.py
```

---

## Case Metadata Schema

Each case in `01-source-materials/` should have a `case-metadata.json` file matching the PostgreSQL Cases table schema:

### Example: `nuno-v-chard-et-al/case-metadata.json`

```json
{
  "title": "Elvis Nuno v. E'Lise Chard, Danielle Chard, YWCA Missoula, et al.",
  "case_number": "NUNO-2015-001",
  "description": "Multi-jurisdictional civil rights violation case involving false prosecution, RICO conspiracy, institutional corruption, and witness intimidation spanning 2015-2025.",
  "status": "open",
  "jurisdiction": "Montana, Washington (multi-jurisdictional)",
  "case_type": "civil-rights, police-misconduct, rico-conspiracy, institutional-corruption",
  "date_filed": "2015-11-15",
  "plaintiff_name": "Elvis Nuno",
  "defendant_name": "E'Lise Chard, Danielle Chard, YWCA Missoula, Connie Brueckner, Ethan Smith, et al.",
  "outcome": "pending",
  "damages_claimed": 18000000,
  "notes": "RICO treble damages ($6M base), multi-victim pattern evidence, interstate coordination.",
  "tags": ["civil-rights", "rico", "institutional-corruption", "witness-intimidation", "malicious-prosecution"],
  "related_cases": ["002-ywca-institutional-corruption"],
  "documents": [
    {
      "filename": "executive-summary.pdf",
      "file_type": "pdf",
      "category": "case-summary",
      "source_path": "narrative/pdfs/01_Executive_Summary.pdf"
    },
    {
      "filename": "sworn-declaration.pdf",
      "file_type": "pdf",
      "category": "testimony",
      "source_path": "narrative/pdfs/09_Elvis_Nuno_Sworn_Declaration.pdf"
    },
    {
      "filename": "court-dismissal-missoula.pdf",
      "file_type": "pdf",
      "category": "court-document",
      "source_path": "evidence/court-documents/Missoula-Case-66-Court-Order-Dismissal.pdf"
    }
  ],
  "metadata": {
    "jurisdictions_involved": ["Montana", "Washington"],
    "agencies_notified": ["FBI", "Montana AG", "Washington AG", "USAO Montana"],
    "perpetrators_count": 5,
    "victims_count": 10,
    "predicate_acts_count": 20,
    "time_period": "2015-2025"
  }
}
```

---

## Migration Strategy

### Phase 1: Preserve & Reorganize (Week 1)

**Goal:** Reorganize existing files without data loss

1. Create new directory structure
2. Move files from current locations to new locations
3. Preserve all LaTeX, Markdown, PDF versions
4. Update scripts to reference new paths
5. Test conversion scripts still work

**Commands:**
```bash
# Create new structure
mkdir -p 01-source-materials/{nuno-v-chard-et-al,ywca-institutional-corruption,templates}
mkdir -p 02-platform-ready/{cases,documents,migration-scripts}
mkdir -p 03-published-outputs/{criminal-referral-packet,civil-litigation-packet,public-documentation}

# Move nuno-case materials
mv markdown/criminal-investigation-referral_nuno-case 01-source-materials/nuno-v-chard-et-al/narrative/markdown/
mv latex/criminal-investigation-referral_nuno-case 01-source-materials/nuno-v-chard-et-al/narrative/latex/
mv pdfs/criminal-investigation-nuno-case 01-source-materials/nuno-v-chard-et-al/narrative/pdfs/

# Move evidence
mv evidentiary-documentation 01-source-materials/nuno-v-chard-et-al/evidence/
```

### Phase 2: Generate Metadata (Week 2)

**Goal:** Create case-metadata.json files and platform-ready data

1. Create `case-metadata.json` for each case
2. Run `scripts/migration/generate-case-json.py` to create `02-platform-ready/cases/*.json`
3. Copy documents to `02-platform-ready/documents/`
4. Generate SQL import scripts

**Tools to Create:**
- `scripts/migration/generate-case-json.py`
- `scripts/migration/generate-import-sql.py`
- `scripts/migration/validate-metadata.py`

### Phase 3: Platform Import (Week 3)

**Goal:** Import data into PostgreSQL

1. Run migration SQL scripts
2. Verify data integrity
3. Test case browsing on platform
4. Upload documents via API
5. Verify Arweave archival pipeline

**SQL Example:**
```sql
-- scripts/migration-scripts/001-import-cases.sql
INSERT INTO cases (
  id,
  title,
  case_number,
  description,
  status,
  jurisdiction,
  case_type,
  date_filed,
  plaintiff_name,
  defendant_name,
  outcome,
  damages_claimed,
  notes,
  created_by,
  created_at
)
SELECT
  gen_random_uuid(),
  metadata->>'title',
  metadata->>'case_number',
  metadata->>'description',
  metadata->>'status',
  metadata->>'jurisdiction',
  metadata->>'case_type',
  (metadata->>'date_filed')::DATE,
  metadata->>'plaintiff_name',
  metadata->>'defendant_name',
  metadata->>'outcome',
  (metadata->>'damages_claimed')::INTEGER,
  metadata->>'notes',
  (SELECT id FROM users WHERE email = 'admin@misjustice.org'),
  NOW()
FROM (
  -- Import from JSON file
  SELECT jsonb_array_elements(
    pg_read_file('/path/to/02-platform-ready/cases/001-nuno-v-chard-et-al.json')::jsonb
  ) AS metadata
) AS case_data;
```

---

## Benefits of New Structure

| Benefit | Description |
|---------|-------------|
| **Database Alignment** | Structure mirrors PostgreSQL schema (Cases, Documents) |
| **Clear Migration Path** | 01-source → 02-platform-ready → 03-published |
| **Separation of Concerns** | Source materials ≠ Platform data ≠ Published outputs |
| **Automation Ready** | Scripts can automate source → platform conversion |
| **Arweave Pipeline** | Platform-ready data flows to Arweave archival |
| **Version Control** | Source materials preserved for reference |
| **Scalability** | Easy to add new cases using same structure |

---

## Rollout Plan

### Step 1: Approval & Planning (This Week)
- [ ] Review this reorganization plan
- [ ] Approve new structure
- [ ] Schedule migration work

### Step 2: Backup (Day 1)
- [ ] Create complete backup of content-archive/
- [ ] Verify backup integrity
- [ ] Store backup in safe location

### Step 3: Create New Structure (Day 1-2)
- [ ] Create all new directories
- [ ] Move files to new locations
- [ ] Update README.md with new structure
- [ ] Update CHANGELOG.md

### Step 4: Generate Metadata (Day 3-5)
- [ ] Create case-metadata.json files
- [ ] Write migration scripts
- [ ] Generate platform-ready JSON
- [ ] Generate SQL import scripts

### Step 5: Testing (Day 6-7)
- [ ] Test conversion scripts
- [ ] Validate metadata completeness
- [ ] Verify file paths
- [ ] Test SQL imports (dry run)

### Step 6: Documentation (Day 7)
- [ ] Update README.md
- [ ] Document migration process
- [ ] Create migration guide
- [ ] Update scripts documentation

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Data Loss** | Complete backup before any moves |
| **Broken Scripts** | Test all scripts after reorganization |
| **Path References** | Update all hardcoded paths in scripts |
| **Missing Metadata** | Validate all case-metadata.json files |
| **Import Failures** | Test SQL imports on staging database first |

---

## Next Steps

1. **Review this plan** - Approve structure and migration strategy
2. **Create backup** - Full backup of content-archive/
3. **Execute Phase 1** - Reorganize files (Week 1)
4. **Execute Phase 2** - Generate metadata (Week 2)
5. **Execute Phase 3** - Platform import (Week 3)

---

**Status:** Awaiting Approval
**Estimated Effort:** 2-3 weeks
**Risk Level:** Low (with proper backup)
**Impact:** High (enables full platform functionality)
