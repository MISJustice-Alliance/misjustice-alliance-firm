# Legal Advocacy Content Archive

> ⚠️ **REORGANIZATION IN PROGRESS** - This archive is being restructured to align with the MISJustice Alliance platform architecture. See [REORGANIZATION_PLAN.md](./REORGANIZATION_PLAN.md) for details.

## Overview

This repository contains comprehensive legal documentation and evidentiary materials for the criminal investigation referral and civil rights litigation in **Elvis Nuno v. E'Lise Chard, et al.**

The content is being reorganized from a **format-centric structure** (organized by file type: LaTeX/Markdown/PDF) to a **case-centric structure** (organized by legal cases with structured metadata) to support the MISJustice Alliance platform's database-driven architecture.

---

## Reorganization Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Planning** | ✅ Complete | Reorganization plan created ([REORGANIZATION_PLAN.md](./REORGANIZATION_PLAN.md)) |
| **Documentation** | 🔄 In Progress | Updating README and documentation |
| **File Migration** | ⏳ Pending | Moving files to new structure (awaiting approval) |
| **Metadata Generation** | ⏳ Pending | Creating case-metadata.json files |
| **Platform Import** | ⏳ Pending | PostgreSQL import and Arweave archival |

**Next Steps:**
1. Review [REORGANIZATION_PLAN.md](./REORGANIZATION_PLAN.md)
2. Approve new structure
3. Create backup before migration
4. Execute Phase 1 (file reorganization)

---

## Current Structure (Format-Centric)

**Current organization** - Files organized by format type:

```
content-archive/
├── README.md                          (This file)
├── CHANGELOG.md                       (Version history)
├── REORGANIZATION_PLAN.md             (Migration plan - NEW)
├── cover-letter-template.txt          (Template)
│
├── markdown/                          (Organized by format)
│   ├── nuno-case-archive-FULL/        (Full case archive)
│   ├── packet-a_ywca-rico-predicates/ (YWCA RICO case)
│   ├── packet-b_nuno-case-cover-letters/  (Cover letters)
│   └── criminal-investigation-referral_nuno-case/
│
├── latex/                             (LaTeX source files)
│   ├── packet-a_ywca-rico-predicates/
│   ├── packet-b_nuno-case-cover-letters/
│   ├── criminal-investigation-referral_nuno-case/
│   └── letterhead-template/
│
├── pdfs/                              (Compiled PDFs)
│   ├── packet_a-ywca_rico_dossier/
│   ├── packet_b-nuno-case/
│   └── criminal-investigation-nuno-case/
│
├── evidentiary-documentation/         (Evidence files)
│   ├── Court-Documents/
│   ├── Formal-Complaints/
│   ├── Other-Victims/
│   ├── Police-Reports/
│   ├── Tyleen-Root-Harassment/
│   └── YWCA-Missoula/
│
├── legal/                             (Legal references)
│   ├── templates/
│   ├── precedents/
│   └── standards/
│
└── scripts/                           (Conversion tools)
    ├── latex_to_markdown.py
    ├── latex_to_markdown.sh
    └── latex_to_markdown_fixed.sh
```

### Problems with Current Structure

- ❌ **No database alignment** - Doesn't map to PostgreSQL schema
- ❌ **Duplication** - Same content in 3 formats (LaTeX, Markdown, PDF)
- ❌ **No metadata** - Missing structured case information for platform import
- ❌ **Mixed concerns** - Source materials mixed with published outputs

---

## Planned Future Structure (Case-Centric)

**Platform-aligned organization** - Files organized by legal case with structured metadata:

```
content-archive/
│
├── 01-source-materials/               (Original docs - PRESERVED)
│   ├── nuno-v-chard-et-al/           (Primary case)
│   │   ├── case-metadata.json         (Structured metadata ⭐ NEW)
│   │   ├── narrative/                 (Case documents)
│   │   ├── evidence/                  (Supporting files)
│   │   └── legal-analysis/            (Legal memos)
│   ├── ywca-institutional-corruption/ (Related case)
│   └── templates/
│
├── 02-platform-ready/                 (Database import ready ⭐ NEW)
│   ├── cases/                         (JSON matching Cases table)
│   ├── documents/                     (Files for upload)
│   └── migration-scripts/             (SQL import scripts)
│
├── 03-published-outputs/              (Distribution packets ⭐ NEW)
│   ├── criminal-referral-packet/
│   ├── civil-litigation-packet/
│   └── public-documentation/
│
└── scripts/
    ├── conversion/                    (LaTeX → Markdown)
    ├── migration/                     (Source → Platform-ready ⭐ NEW)
    └── publishing/                    (Platform → Arweave ⭐ NEW)
```

### Benefits of New Structure

| Benefit | Description |
|---------|-------------|
| **Database Alignment** | Structure mirrors PostgreSQL schema (Cases, Documents) |
| **Clear Migration Path** | Source → Platform-ready → Published (3-phase pipeline) |
| **Separation of Concerns** | Source materials ≠ Platform data ≠ Distribution packets |
| **Automation Ready** | Scripts can automate entire source-to-platform pipeline |
| **Arweave Integration** | Platform-ready data flows directly to Arweave archival |
| **Version Control** | Source materials preserved as historical reference |
| **Scalability** | Easy to add new cases using same structure |
| **Metadata-Driven** | case-metadata.json enables database import |

### Key Changes

⭐ **New Additions:**
- `case-metadata.json` files (structured metadata matching PostgreSQL Cases table)
- `02-platform-ready/` directory (database import staging area)
- `03-published-outputs/` directory (distribution packets)
- Migration scripts (`generate-case-json.py`, `generate-import-sql.py`)
- Publishing scripts (`bundle-for-arweave.py`)

🔧 **Reorganization:**
- Case materials consolidated (narrative + evidence + analysis)
- Scripts organized by purpose (conversion, migration, publishing)
- Evidence linked to specific cases

---

## Migration Timeline

**Total Duration:** 2-3 weeks

| Week | Phase | Tasks |
|------|-------|-------|
| **Week 1** | Phase 1: Preserve & Reorganize | Create new structure, move files, update paths |
| **Week 2** | Phase 2: Generate Metadata | Create case-metadata.json, generate platform-ready JSON/SQL |
| **Week 3** | Phase 3: Platform Import | Import to PostgreSQL, upload documents, verify Arweave pipeline |

**Status:** Awaiting approval to proceed with Phase 1

---

## Original Structure Documentation

<details>
<summary>View original structure documentation (for reference)</summary>

### Original docs/ Directory Structure

```
docs/                              (Idealized structure from v3.0.0)
├── Markdown Documents (.md)
├── latex/ (LaTeX source files)
├── pdfs/ (Compiled PDF documents)
└── evidentiary-documentation/    (Supporting evidence files)
│       ├── INDEX.md                   (Directory index with evidentiary value)
│       │
│       ├── Court-Documents/           (8 files)
│       │   ├── E-Mail-Bryan-Tipp-Dec-2020.pdf
│       │   ├── E-Mail-Bryan-Tipp-Jan-2021.pdf
│       │   ├── Edmonds_Trial-Nuno_Declaration_of_Ineffective_Assistance.pdf
│       │   ├── ELise-OP-Filing-Page1.jpeg
│       │   ├── ELise-OP-Filing-Page2.jpeg
│       │   ├── Missoula-Case-201223-Dismissal-Lowney-iltr.pdf
│       │   ├── Missoula-Case-66-Court-Order-Dismissal.pdf
│       │   └── Seattle-Case-613225-Dismissal.png
│       │
│       ├── Formal-Complaints/         (12 files)
│       │   ├── MT_DOJ_POST-EMail.pdf
│       │   ├── MT-DOJ-POST-Complaint-Page1.jpeg
│       │   ├── MT-DOJ-POST-Complaint-Page2.jpeg
│       │   ├── Nuno-Case-Relationship-Diagram.jpeg
│       │   ├── Nuno-Google-Review-1.jpeg
│       │   ├── Nuno-Google-Review-2.jpeg
│       │   ├── Nuno-PS-YWCA-Email-Complaint.pdf
│       │   ├── Nuno-YWCA-Complaint.jpg
│       │   ├── Office for Professional Accountability 2016OPA-1167.pdf
│       │   ├── Office of Professional Accountability_ 2016OPA-1167.pdf
│       │   ├── Ty-Nuno-Police-Complaint-Ethan-Smith-03-2018.pdf
│       │   └── WA_State_Bar_Complaint_Patricia-Fulton_2016.pdf
│       │
│       ├── Other-Victims/             (4 files - pattern evidence)
│       │   ├── Arthur-Brown-Google-Review.jpeg
│       │   ├── Facebook-HIPPA-Violation-Thread-1.jpeg
│       │   ├── Facebook-HIPPA-Violation-Thread-2.jpeg
│       │   └── YWCA-Reddit-Complaints.jpeg
│       │
│       ├── Police-Reports/            (1 file)
│       │   └── Seattle PD Written statement regarding incident #2016-348587.pdf
│       │
│       ├── Tyleen-Root-Harassment/    (19 screenshot files)
│       │   ├── Tyleen-Root-Harassment-1.jpeg through -10-6.jpeg
│       │   ├── Tyleen-Root-Profile1.jpeg
│       │   ├── Tyleen-Root-Profile-2.jpeg
│       │   └── Tyleen-Root-Profile-3.jpeg
│       │
│       └── YWCA-Missoula/             (1 file)
│           └── ywca-missoula-consolidated-financial-statements-years-2023-2024.pdf
│               [Official ProPublica audit; documents Connie Brueckner as YWCA board member]
│
└── scripts/                           (Batch conversion automation tools)
    ├── latex_to_markdown.py           (Python 3.6+ batch converter)
    ├── latex_to_markdown.sh           (Bash 4.0+ batch converter)
    ├── latex_to_markdown_fixed.sh     (Bash 3.x+ compatible converter) ⭐ RECOMMENDED
    ├── QUICK_START.md                 (Quick start guide for scripts)
    └── README.md                      (Scripts documentation)

Total: 12 directories, 88+ files
```

---

## Document Suite Overview

### Part 1: Administrative & Overview Documents

| Document | Purpose | Audience | Key Elements |
|----------|---------|----------|--------------|
| **README.md** | Repository guide and file navigation | All stakeholders | Structure, content, usage instructions |
| **CHANGELOG.md** | Update history and development log | Investigators | Version history, feature additions, bug fixes |
| **docs/INDEX.md** | Evidentiary directory documentation | Legal teams, prosecutors | File descriptions and evidentiary value |

### Part 2: Multi-Agency Criminal Referral Packet (10 Documents)

#### **01. Executive Summary** (20+ pages)

**Purpose:** Comprehensive overview of all crimes, perpetrators, victims, timeline, and legal violations

**Key Content:**
- Elvis Nuno background and damages ($18M RICO treble)
- Perpetrators: Danielle Chard, E'Lise Chard, Officer Ethan Smith, Detective Connie Brueckner, YWCA Missoula
- 20+ federal and state predicate acts
- RICO conspiracy structure and enterprise liability
- Institutional conflicts of interest
- Multi-victim pattern evidence

**Recipients:** FBI, DOJ, MT AG, WA AG, USAO

**Formats:** `docs/01_Executive_Summary.md` | `docs/latex/01_Executive_Summary.tex` | `docs/pdfs/01_Executive_Summary.pdf`

#### **02. FBI Civil Rights Cover Letter** (9 pages)

**Purpose:** Specific request for federal civil rights investigation under RICO statutes

**Key Content:**
- 42 U.S.C. § 1983 deprivation of rights claims
- RICO violations (18 U.S.C. § 1961–1968)
- Conspiracy to violate rights (18 U.S.C. § 241)
- Witness intimidation (18 U.S.C. § 1512)
- Treble damages calculation
- Interstate coordination evidence

**Recipient:** FBI Field Office (Seattle or Billings)

**Formats:** `docs/02_FBI_Civil_Rights_Cover_Letter.md` | `.tex` | `.pdf`

#### **03. Montana AG Cover Letter** (4 pages)

**Purpose:** Request for state criminal investigation and prosecution

**Key Content:**
- Montana-specific crimes (perjury, defamation, harassment, stalking)
- Missoula PD and detective misconduct
- YWCA institutional violations under MT law
- State court jurisdiction and charges
- Evidence of Montana residents harmed

**Recipient:** Montana Attorney General

**Formats:** `docs/03_Montana_AG_Cover_Letter.md` | `.tex` | `.pdf`

#### **04. Washington AG Cover Letter** (6 pages)

**Purpose:** Interstate coordination request for Washington state investigation

**Key Content:**
- Washington criminal statutes violated (harassment, malicious prosecution, witness intimidation)
- Seattle Police Department and Edmonds PD involvement
- King County prosecutor misconduct
- Protection order fraud and misuse
- Coordinated multi-state conspiracy

**Recipient:** Washington Attorney General

**Formats:** `docs/04_Washington_AG_Cover_Letter.md` | `.tex` | `.pdf`

#### **05. USAO Montana Cover Letter** (5 pages)

**Purpose:** Request for federal grand jury and RICO prosecution

**Key Content:**
- Federal jurisdiction basis (interstate commerce, mail/wire fraud)
- RICO predicate acts (20+ listed)
- Enterprise liability theory
- Conspiracy formation and ongoing coordination
- Witness availability and cooperation
- Grand jury referral request

**Recipient:** United States Attorney for District of Montana

**Formats:** `docs/05_USAO_Montana_Cover_Letter.md` | `.tex` | `.pdf`

#### **06. Danielle Chard Criminal Report** (7 pages)

**Purpose:** Detailed criminal analysis of Danielle Chard's individual perpetrator conduct

**Key Content:**
- False reporting of armed/murder-suicide threat (November 2015)
- Malicious prosecution across multiple jurisdictions
- Perjury in court proceedings
- Wire and mail fraud in false documents
- Pattern of false accusations (2015–2025)
- Damages and civil rights harm
- Recommended charges

**Formats:** `docs/06_Danielle_Chard_Criminal_Report.md` | `.tex` | `.pdf`

#### **07. E'Lise Chard Criminal Report** (8 pages)

**Purpose:** Comprehensive analysis of E'Lise Chard's criminal conduct and YWCA coordination

**Key Content:**
- Perjury in protection order proceedings (June 2018)
- Criminal defamation (false drug history claims)
- First Amendment retaliation
- Recruitment of Tyleen Root as harassment proxy
- YWCA institutional coordination
- Suppression of exculpatory evidence
- Evidence of ongoing conspiracy
- Recommended charges

**Formats:** `docs/07_ELise_Chard_Criminal_Report.md` | `.tex` | `.pdf`

#### **08. YWCA Institutional Corruption Supplemental** (29+ pages)

**Purpose:** Detailed analysis of YWCA Missoula's institutional role in conspiracy and broader pattern of abuse

**Key Content:**
- YWCA governance and financial fraud
- Detective Connie Brueckner's undisclosed conflict
- Fraudulent warrant application and Brady violations
- Multiple victim accounts (beyond Elvis Nuno)
- October 2021 Meadowlark winter evictions (named victim: Jessica Waltz + 3 families)
- Child endangerment and HIPAA violations
- Federal grant fraud allegations
- Systemic institutional dysfunction
- Corporate liability and recommended charges

**Formats:** `docs/08_YWCA_Institutional_Corruption_Supplemental.md` | `.tex` | `.pdf`

#### **09. Elvis Nuno Sworn Declaration** (80+ pages)

**Purpose:** Comprehensive sworn statement by victim detailing all violations, damages, and conspiracy

**Key Content:**
- Complete criminal history with context (coerced pleas)
- November 2015 SWAT raid and false armed/suicidal narrative
- March 2016 coerced plea details
- June 2018 YWCA complaint (protected speech)
- 18-month Montana prosecution (constitutional violations)
- Fraudulent search warrant and Brueckner's conflict
- Search and seizure of work equipment (career destruction)
- E'Lise's perjury and contradictions
- Witness intimidation by Edmonds PD (Partner A threat)
- SLAPP prosecution analysis (Montana's House Bill 292, May 2025)
- RICO predicate acts (detailed timeline)
- Damages: $6.4–$8.4M lost career earnings + $3.4M past damages = $18M RICO treble damages
- Request for criminal referral and investigation

**Formats:** `docs/09_Elvis_Nuno_Sworn_Declaration.md` | `.tex` | `.pdf`

#### **10. Comprehensive Evidentiary Documentation Index** (29 pages)

**Purpose:** Directory index with detailed evidentiary value for all supporting materials

**Key Content:**
- 45 total evidentiary files organized across 6 subdirectories
- Court documents (8 files): Dismissals, declarations, emails
- Formal complaints (12 files): POST, OPA, bar complaints, relationship diagrams
- Other victims (4 files): Pattern evidence of institutional harm
- Police reports (1 file): Seattle PD incident documentation
- Tyleen Root harassment (19 files): Defamation and business sabotage
- YWCA financial records (1 file): Board member documentation
- Detailed description of each file and its evidentiary value for prosecution, civil rights claims, and damages modeling

**Formats:** `docs/10_Comprehensive_Evidentiary_Documentation.md` | `.tex` | `.pdf`

---

## Batch Conversion Tools

### **NEW: `/scripts` Directory** ⭐

The repository now includes automated batch conversion tools for maintaining synchronization between LaTeX source files and Markdown output.

#### **Available Scripts:**

| Script | Compatibility | Features | Status |
|--------|---------------|----------|--------|
| **latex_to_markdown.py** | Python 3.6+ (all platforms) | Cross-platform, verbose mode, advanced error handling | ✅ Production ready |
| **latex_to_markdown.sh** | Bash 4.0+ (modern Linux) | Fast, colored output, mapfile arrays | ✅ Production ready |
| **latex_to_markdown_fixed.sh** | Bash 3.x+ (macOS compatible) | Backward compatible, works on older systems | ⭐ **RECOMMENDED** |

#### **Quick Start:**

```bash
# Most compatible option (works on macOS default Bash 3.2)
cd scripts/
bash latex_to_markdown_fixed.sh ../docs/latex/ ../docs/

# Python option (cross-platform)
python latex_to_markdown.py ../docs/latex/ ../docs/

# Modern Linux option (requires Bash 4.0+)
bash latex_to_markdown.sh ../docs/latex/ ../docs/
```

#### **Documentation:**

- **scripts/QUICK_START.md** - Fast-track user guide
- **scripts/README.md** - Complete documentation with examples
- **scripts/** - All conversion tools

**See `scripts/QUICK_START.md` for detailed usage instructions.**

---

## File Formats & Compilation

### Markdown Format (.md)

**Advantages:**
- Plain text, version-controllable
- Directly readable in GitHub/Git systems
- Compatible with all platforms
- Easy for quick reference
- Suitable for online repositories

**Location:** `docs/*.md` (10 primary documents + INDEX.md)

### LaTeX Format (.tex)

**Advantages:**
- Professional legal document formatting
- Consistent typography and page breaks
- Suitable for PDF compilation
- Proper citations and footnotes
- Court-ready presentation

**Location:** `docs/latex/*.tex` (10 primary documents)

### PDF Format (.pdf)

**Advantages:**
- Final, compiled format ready for submission
- Professional appearance
- Print-ready
- Submission-ready for agencies
- Preserves all formatting

**Location:** `docs/pdfs/*.pdf` (10 primary documents)

---

## Key Statistics

| Metric | Count |
|--------|-------|
| **Total Characters** | ~250,000+ |
| **Total Pages** | ~150+ |
| **Total Files** | 88+ |
| **Documents (Markdown)** | 10 + INDEX |
| **Documents (LaTeX)** | 10 |
| **Documents (PDF)** | 10 |
| **Evidentiary Files** | 45 |
| **Evidentiary Directories** | 6 |
| **Conversion Scripts** | 5 |
| **Time Period Covered** | 2015–2025 |
| **Jurisdictions** | 2 (Montana, Washington) |
| **Victims Documented** | 10+ |
| **Perpetrators Named** | 5 primary + multiple law enforcement |
| **RICO Predicates** | 20+ federal crimes |
| **Estimated Damages** | $61.2M+ (RICO treble damages) |

---

## Usage Instructions

### For Investigators & Prosecutors

1. **Start with:** `docs/01_Executive_Summary.md` or `.pdf`
2. **Then review:** Appropriate cover letters (02–05) for your jurisdiction
3. **Reference:** Individual perpetrator reports (06–07)
4. **Examine:** YWCA institutional analysis (08)
5. **Study:** Sworn declaration for detailed factual basis (09)
6. **Consult:** Evidentiary index (10 / INDEX.md) for specific documents

### For Legal Analysis

- **Constitutional claims:** See `docs/09_Elvis_Nuno_Sworn_Declaration.md` (Sections IV–V, XIII–XIV, XVII)
- **RICO analysis:** See `docs/01_Executive_Summary.md` + `docs/09_Sworn_Declaration.md` (RICO section)
- **Malpractice claims:** See Court-Documents in evidentiary directory
- **Institutional liability:** See `docs/08_YWCA_Institutional_Corruption_Supplemental.md`
- **Damages modeling:** See `docs/01_Executive_Summary.md` + individual perpetrator reports

### For Multi-Agency Distribution

**Option 1: Segmented Distribution**
- FBI: 01 (Executive Summary) + 02 (FBI Cover Letter) + 05 (USAO Letter) + all evidence
- Montana AG: 01 + 03 (MT AG Letter) + 06, 07, 08, 09 + all evidence
- Washington AG: 01 + 04 (WA AG Letter) + 06, 07, 09 + all evidence

**Option 2: Complete Package Distribution**
- Send all 10 primary documents + INDEX + full evidentiary directory
- Allows each agency to extract relevant materials

### For Civil Rights Litigation

- Use `docs/01_Executive_Summary.md` for background and damages
- Reference `docs/09_Sworn_Declaration.md` as primary testimony
- Cite evidentiary files (`docs/evidentiary-documentation/INDEX.md`) for exhibits
- Cross-reference institutional documents (08) for entity liability

---

## Development Workflow

### Updating Documents

```bash
# 1. Edit LaTeX source files
cd docs/latex/
vim 01_Executive_Summary.tex

# 2. Compile to PDF
pdflatex 01_Executive_Summary.tex
mv 01_Executive_Summary.pdf ../pdfs/

# 3. Convert to Markdown (using compatible script)
cd ../../scripts/
bash latex_to_markdown_fixed.sh ../docs/latex/ ../docs/

# 4. Verify conversion
cd ../docs/
diff 01_Executive_Summary.md (check changes)

# 5. Commit changes
git add .
git commit -m "Updated Executive Summary with [description]"
git push
```

### Maintaining Synchronization

The LaTeX files in `docs/latex/` are the **source of truth**. To keep Markdown files synchronized:

```bash
# Run batch conversion after any LaTeX updates
cd scripts/
bash latex_to_markdown_fixed.sh ../docs/latex/ ../docs/
```

This ensures `docs/*.md` files always reflect the latest `docs/latex/*.tex` content.

---

## Recent Updates

### December 10, 2025 - v3.0.0 (Major Restructure)

**Repository Reorganization:**
- ✅ Created `docs/` directory for all legal documents
- ✅ Created `scripts/` directory for conversion automation
- ✅ Moved all markdown files to `docs/`
- ✅ Organized LaTeX sources in `docs/latex/`
- ✅ Organized PDFs in `docs/pdfs/`
- ✅ Moved evidence to `docs/evidentiary-documentation/`

**New Tools:**
- ✅ Python batch converter (cross-platform)
- ✅ Bash batch converter (Linux/Unix)
- ✅ Bash 3.x compatible converter (macOS/older systems) ⭐
- ✅ Quick start guide
- ✅ Complete script documentation

**Markdown Updates:**
- ✅ Regenerated all .md files from updated .tex sources
- ✅ Synchronized docs/*.md with docs/latex/*.tex
- ✅ Verified conversion accuracy

See `CHANGELOG.md` for complete version history.

---

## Status & Verification

| Item | Status |
|------|--------|
| Repository Structure | ✓ Reorganized (v3.0.0) |
| Markdown Conversion | ✓ Complete & Synchronized |
| LaTeX Formatting | ✓ Complete & Validated |
| PDF Compilation | ✓ Complete |
| Evidentiary Index | ✓ Complete |
| Batch Conversion Tools | ✓ 3 scripts ready |
| Legal Review | ✓ Coordinated with counsel |
| Ready for Submission | ✓ Yes |

---

</details>

---

## Contact & Coordination

**For questions about reorganization:**
- Review [REORGANIZATION_PLAN.md](./REORGANIZATION_PLAN.md) for detailed migration plan
- Consult [CHANGELOG.md](./CHANGELOG.md) for version history
- Check current structure status in this README

**For questions about content:**
- See markdown/, latex/, or pdfs/ directories for case documents
- Review evidentiary-documentation/ for supporting evidence
- Check scripts/ for conversion tools

**For platform integration:**
- See ../DEVELOPMENT_PLAN.md for platform architecture
- See ../backend/ for database schema and API
- See 02-platform-ready/ (after Phase 2) for import-ready data

---

**Repository Created:** December 2025
**Last Updated:** January 1, 2026
**Version:** v4.0.0-dev (Reorganization in progress)
**Status:** Active - Reorganization Planning Phase
