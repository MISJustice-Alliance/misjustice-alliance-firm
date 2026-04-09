# MISJustice Alliance Firm — Data Classification Policy

> **Document:** `policies/DATA_CLASSIFICATION.md`  
> **Version:** 1.0.0  
> **Effective:** 2026-04-09  
> **Owner:** Platform Operations / Human Operator  
> **Review cycle:** Annual or upon material platform change  
> **Policy references:** [`docs/legal/ethics_policy.md`](../docs/legal/ethics_policy.md) · [`policies/SEARCH_TOKEN_POLICY.md`](../policies/SEARCH_TOKEN_POLICY.md) · [`agents/README.md`](../agents/README.md)

---

## Purpose

This policy defines how all data within the MISJustice Alliance Firm platform is classified, stored, accessed, transmitted, retained, and destroyed. It applies to every human operator, AI agent, service, integration, and automated pipeline that touches platform data.

The classification model exists to protect:

- **Survivor safety** — preventing re-identification of complainants, witnesses, and vulnerable parties.
- **Attorney-client privilege and work-product doctrine** — preserving legal confidentiality for attorney-referred matters.
- **Evidentiary integrity** — maintaining chain-of-custody and admissibility for case materials.
- **Operational security** — limiting exposure of platform internals, credentials, and system configuration.

All data within the platform is assigned a Tier at ingestion. The Tier governs every downstream decision about that data. When in doubt, assign the higher (more restrictive) Tier.

---

## Table of Contents

- [Tier Definitions](#tier-definitions)
  - [Tier 0 — Strictly Confidential](#tier-0--strictly-confidential)
  - [Tier 1 — Restricted](#tier-1--restricted)
  - [Tier 2 — Internal](#tier-2--internal)
  - [Tier 3 — Public-Approved](#tier-3--public-approved)
- [Tier Controls Summary](#tier-controls-summary)
- [Agent-to-Tier Access Matrix](#agent-to-tier-access-matrix)
- [Classification Decision Tree](#classification-decision-tree)
- [Downward Reclassification (De-identification)](#downward-reclassification-de-identification)
- [Git Hygiene and Commit Rules](#git-hygiene-and-commit-rules)
- [Retention and Destruction](#retention-and-destruction)
- [Incident and Breach Obligations](#incident-and-breach-obligations)
- [Policy Maintenance](#policy-maintenance)

---

## Tier Definitions

---

### Tier 0 — Strictly Confidential

**Definition:** Data that directly identifies or could foreseeably re-identify a survivor, complainant, witness, minor, or protected party; attorney-client privileged communications; attorney work product containing case strategy, legal theories, or mental impressions; raw unredacted evidence; and credential or key material.

**Examples:**
- Complainant legal name, address, phone number, email, date of birth, SSN, government ID
- Minor identifiers of any kind
- Raw call recordings and transcripts containing PII
- Unredacted police reports, court filings, and medical records
- Attorney–client email and messaging threads
- Case strategy memos, legal theory notes, work-product documents
- Witness statements with identifying information
- Platform secrets: API keys, service tokens, database credentials, private keys, seed phrases
- Contributor signed ethics acknowledgment records
- Signed referral authorization records

**Storage:**
- Proton Drive (E2EE) for human-accessed documents
- Platform secrets in HashiCorp Vault or equivalent secrets manager — never in environment variables, config files, or code
- Never in the git repository — not in any branch, not in history
- Never in MCAS, OpenRAG, Open Notebook, GitBook, or any agent-accessible system
- Never in SearXNG indexes or RAG pipelines

**Encryption:**
- At rest: AES-256 minimum; E2EE preferred (Proton)
- In transit: TLS 1.3 minimum; E2EE where available
- Credential material: secrets manager only; never plaintext

**Access:**
- Human operators only — no agent access under any circumstances
- Need-to-know within the human operator team
- Access events logged with timestamp, operator ID, and purpose

**Transmission:**
- Proton Mail (E2EE) for document sharing between humans
- No transmission via SMS, unencrypted email, Slack, Discord, or any unencrypted channel
- No transmission to any AI agent, API, or external service
- Referral packet transmission: Tier 0 content must be de-identified to Tier 2 minimum before inclusion in any referral packet

**Retention:** Per matter lifecycle plus applicable statutory hold period (see [Retention and Destruction](#retention-and-destruction)).

**Destruction:** Secure deletion (NIST SP 800-88 compliant); Proton Drive purge with confirmation. Physical media: cross-cut shredding.

---

### Tier 1 — Restricted

**Definition:** De-identified case data that retains enough detail to be operationally sensitive; internal analysis, legal research, and research memos that reference specific matters by pseudonym or case ID; referral packet drafts; agent output under human review; system configuration (non-credential).

**Examples:**
- MCAS records using pseudonymous case IDs (no direct PII, but re-identification risk remains with context)
- Rae, Lex, and Iris research memos referencing a specific matter by case ID
- Referral packet drafts prior to de-identification review
- Legal element matrices tied to a specific case ID
- Chronology documents linked to a specific matter
- AgenticMail draft queue contents
- Open Notebook documents under active human review
- System configuration files (non-credential): agent YAML, prompt templates, pipeline config
- Contributor acknowledgment records (stored separately from the repo)

**Storage:**
- MCAS database (access-controlled, encrypted at rest)
- OpenRAG (private, access-controlled instance)
- Open Notebook (access-controlled workspace)
- AgenticMail draft queue (internal-only)
- Never in public-facing systems, GitBook, git repository, or SearXNG public indexes

**Encryption:**
- At rest: AES-256 minimum
- In transit: TLS 1.3 minimum

**Access:**
- Human operators: full access
- Agents: Avery (intake write), Rae (read), Lex (read), Casey (read — export API with operator authorization), Ollie (read — contact records)
- Agent access is scoped to the minimum necessary fields for the agent's defined function
- No access for: Webmaster, Social Media Manager, Sol, Quill, Mira, Chronology (read-only via MCAS Event model for chronology assembly)

**Transmission:**
- Internal platform systems only (MCAS → agent → Open Notebook pipeline)
- No external transmission without human authorization and downward reclassification to Tier 2 minimum
- All inter-service transmission encrypted (TLS 1.3 minimum)

**Retention:** Per matter lifecycle. Research memos: retain for the life of the matter plus 3 years.

**Destruction:** Database record purge with audit log entry; Open Notebook workspace deletion.

---

### Tier 2 — Internal

**Definition:** De-identified, pseudonymized, or abstracted data that does not create a reasonably foreseeable re-identification risk when viewed in isolation; internal-use research outputs without case-specific PII; approved agent research memos ready for human review; approved internal working documents.

**Examples:**
- MCAS records with all direct identifiers removed or pseudonymized, reviewed for re-identification risk
- Legal research memos that discuss legal standards and doctrines without reference to specific complainant or witness identity
- Pattern-of-practice findings referencing actors by role/agency (not by name, unless the actor is a named public official acting in their official capacity)
- Approved chronologies using pseudonymous party designations
- De-identified referral packets approved for transmission to attorneys
- Approved OSINT reports on public officials and public institutions
- Internal platform documentation: architecture diagrams, workflow descriptions, runbooks (non-credential)
- Agent system prompts and SOUL.md files (operationally internal but non-sensitive)

**Storage:**
- MCAS (Tier 2 scope)
- OpenRAG
- Open Notebook
- Internal documentation repository (this repo — non-credential, non-PII only)

**Encryption:**
- At rest: AES-256 minimum
- In transit: TLS 1.3 minimum

**Access:**
- Human operators: full access
- Agents: Avery, Rae, Lex, Iris, Chronology, Citation, Casey, Ollie (per role scope defined in [`agents/README.md`](../agents/README.md))
- Sol and Webmaster: read-only access to Tier 2 exports approved for publication review
- No access for: Social Media Manager, Mira, Quill (except via Tier 3 exports)

**Transmission:**
- Internal platform systems
- External referral packets (de-identified Tier 2 content only, with human authorization)
- Oversight complaint exhibits (de-identified, with human authorization)
- All external transmission logged in MCAS as an outreach event

**Retention:** Matter lifecycle. OSINT reports: retain for 5 years or until superseded.

**Destruction:** MCAS record purge; repo file deletion with git history scrub if applicable.

---

### Tier 3 — Public-Approved

**Definition:** Data that has been explicitly reviewed by a human operator, fully redacted of all direct and indirect identifiers (unless the subject is a named public official acting in their official capacity and the information is a matter of public record), verified by Sol, and approved for public release.

**Examples:**
- Published case summaries on `misjusticealliance.org`
- YWCA of Missoula GitBook case library entries
- Approved social media posts and campaign content
- Public advocacy resource documents
- Public statutory analysis and legal explainers
- Named public official conduct summaries based entirely on public record
- Platform README, public documentation, and open-source code

**Storage:**
- `misjusticealliance.org` (public web)
- GitBook (public)
- Social media platforms
- This git repository (public-safe content only)

**Encryption:** Standard HTTPS/TLS for web delivery. No special encryption requirements beyond standard web security.

**Access:** Public. No access controls required once published.

**Transmission:** Unrestricted once human-approved and published.

**Publication requirements (all must be met before Tier 3 assignment):**
1. Human operator has reviewed the full document for PII and re-identification risk.
2. Sol QA report has been produced and all flagged items resolved.
3. Human operator has explicitly authorized the publication and indexing decision.
4. MCAS publication event has been logged.

**Retention:** Indefinite while the matter is active; archive per platform archival policy.

**Destruction / Takedown:** Human operator decision; all copies removed from web properties, CDN cache purged, MCAS publication event updated with takedown record.

---

## Tier Controls Summary

| Control | Tier 0 | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|---|
| **Storage** | Proton Drive / Vault only | MCAS, OpenRAG, Open Notebook | MCAS, OpenRAG, Open Notebook, repo | Public web, GitBook, repo |
| **Encryption at rest** | E2EE required | AES-256 minimum | AES-256 minimum | HTTPS/TLS |
| **Encryption in transit** | E2EE required | TLS 1.3 minimum | TLS 1.3 minimum | HTTPS |
| **Agent access** | ❌ None | ✅ Scoped (Avery, Rae, Lex, Casey, Ollie) | ✅ Scoped (most internal agents) | ✅ Webmaster, Quill, Sol (read) |
| **Human access** | Need-to-know | Internal operators | Internal operators | Public |
| **External transmission** | ❌ Prohibited | ❌ Requires de-identification → Tier 2 | ✅ With human authorization | ✅ Unrestricted (post-approval) |
| **Git repository** | ❌ Never | ❌ Never | ⚠️ Non-sensitive config only | ✅ Permitted |
| **SearXNG indexing** | ❌ Never | ❌ Never (T1-internal MCAS search only) | ✅ T1/T2 internal search indexes | ✅ T0 public search |
| **HITL gate required** | N/A (human-only) | Yes — classification and transmission | Yes — reclassification and export | Yes — Sol QA + publication approval |
| **Retention** | Matter lifecycle + statutory hold | Matter lifecycle + 3 years | Matter lifecycle / 5 years (OSINT) | Indefinite / archive |
| **Destruction method** | NIST SP 800-88 secure delete | Database purge + audit log | Database purge / git delete | Takedown + CDN purge |

---

## Agent-to-Tier Access Matrix

This matrix defines the maximum Tier each agent may access for read and write operations. Access is further scoped by the agent's defined role — an agent may be listed as having Tier 2 read access but only to specific MCAS models defined in [`agents/README.md`](../agents/README.md).

| Agent | Max Read Tier | Max Write Tier | Notes |
|---|---|---|---|
| **Avery** | Tier 1 | Tier 1 | Intake write; Tier classification proposals require human confirmation |
| **Mira** | Tier 1 (Event model only) | Tier 1 (Event logging) | Telephony events only; no case-record read |
| **Rae** | Tier 1 | Tier 2 (Open Notebook, OpenRAG) | Research read from Tier 1 MCAS; research output written as Tier 2 |
| **Lex** | Tier 1 (with operator grant) | Tier 2 (Open Notebook, OpenRAG) | Pattern-of-practice findings require HITL gate before any external use |
| **Iris** | Tier 2 (actor/agency records) | Tier 2 (OSINT reports) | Prohibited from accessing Tier 0/1 complainant or witness records |
| **Chronology** | Tier 1 (Event model, read-only) | Tier 2 (Open Notebook) | Reads Tier 1 MCAS Events; outputs written as Tier 2 |
| **Citation** | Tier 2 (OpenRAG read) | Tier 2 (Open Notebook annotations) | No MCAS write; public legal source fetch only |
| **Casey** | Tier 1 (export API — human auth required) | Tier 2 (referral memos) | Export requires explicit human authorization per referral |
| **Ollie** | Tier 1 (contact records only) | Tier 1 (outreach event logging) | No case-record read beyond contact and matter context |
| **Webmaster** | Tier 3 (approved exports only) | Tier 3 (web publication) | No Tier 0/1/2 access |
| **Social Media Manager** | Tier 3 (approved content only) | Tier 3 (platform posting — human-approved) | No MCAS or OpenRAG access |
| **Sol** | Tier 3 (+ Tier 2 redaction check) | Tier 2 (QA report in Open Notebook) | Tier 2 access scoped to redaction verification only |
| **Quill** | Tier 3 (approved exports only) | Tier 3 (GitBook) | No Tier 0/1/2 access |
| **Vane** | Tier 4 / Admin (human operator only) | N/A (human interface) | Not an autonomous agent; file upload restricted to Tier 2/3 until RBAC implemented |

---

## Classification Decision Tree

When classifying a new item at ingestion, apply the following questions in order. Stop at the first "Yes" and assign that Tier.

```
1. Does this item contain any of the following?
   - Complainant, survivor, witness, or minor direct identifier (name, DOB, address,
     phone, email, SSN, government ID, biometric, photo)
   - Attorney–client privileged communication or work-product
   - Raw unredacted evidence (police report, court filing, medical record, call recording)
   - Platform credential, API key, secret, or private key
   → YES → Tier 0

2. After removing or pseudonymizing direct identifiers, does this item:
   - Reference a specific matter by case ID in a way that could re-identify parties
     with context available to the recipient?
   - Contain legal analysis, research memos, or strategy tied to a specific case ID?
   - Constitute a draft referral packet, draft outreach, or pre-approval agent output?
   - Contain non-credential system configuration (agent YAML, prompt templates)?
   → YES → Tier 1

3. Is this item fully de-identified of direct and indirect identifiers, and:
   - Used only internally by agents and human operators?
   - Not yet approved for public release?
   - A public official conduct record based on public record but not yet reviewed
     for publication?
   → YES → Tier 2

4. Has this item been:
   - Reviewed by a human operator?
   - Cleared by Sol QA?
   - Explicitly authorized for public release by a human operator?
   → YES → Tier 3

Default: When uncertain between two adjacent Tiers, assign the higher (more restrictive) Tier
and request human review.
```

---

## Downward Reclassification (De-identification)

Downward reclassification — moving an item from a higher Tier to a lower Tier — is a **human-only action**. No agent may reclassify data downward autonomously.

### Requirements for Tier 0 → Tier 1

1. Human operator performs direct identifier removal or irreversible pseudonymization.
2. Human operator verifies that the pseudonym cannot be reversed without the mapping key.
3. The mapping key (pseudonym ↔ real identity) is stored as Tier 0 in Proton Drive.
4. MCAS record updated with the new classification and operator ID.
5. Original Tier 0 document retained separately per retention schedule.

### Requirements for Tier 1 → Tier 2

1. Human operator reviews the item for residual re-identification risk in context.
2. Human operator confirms that no case-ID context available to the recipient can be used to re-identify parties.
3. MCAS record updated with the new classification and operator ID.

### Requirements for Tier 2 → Tier 3 (Publication)

1. Webmaster or Quill stages the content and submits to Sol for QA.
2. Sol produces a QA report covering: fact-check, citation accuracy, redaction spot-check, and statutory characterization review.
3. Human operator reviews Sol QA report and resolves all flagged items.
4. Human operator explicitly authorizes publication and selects indexing scope.
5. MCAS publication event logged with: operator ID, timestamp, publication target, Sol QA report reference, and indexing decision.

### Prohibited reclassification paths

- **Tier 0 → Tier 2 or Tier 3 in a single step:** Not permitted. Must pass through Tier 1 review first.
- **Agent-initiated downward reclassification of any kind:** Not permitted. Agents may propose a Tier, but classification and reclassification decisions are always made by a human operator.
- **Batch reclassification without per-item review:** Not permitted. Each item must be individually reviewed.

---

## Git Hygiene and Commit Rules

The `misjustice-alliance-firm` repository is a **public repository**. The following rules are absolute and non-negotiable.

### Prohibited in this repository (any branch, any commit, any history)

- Tier 0 data of any kind
- Tier 1 data of any kind
- API keys, service tokens, database credentials, private keys, seed phrases, passwords
- Any file containing PII, even in a comment or example
- `.env` files (`.env.example` with placeholder values only is permitted)
- Database dumps, exports, or backups
- Unredacted case documents, legal memos, or research outputs
- Any file intended for Proton Drive, MCAS, or OpenRAG storage

### Required for all commits

- All secrets sourced from environment variables or a secrets manager at runtime — never hardcoded
- `.gitignore` must include: `.env`, `*.key`, `*.pem`, `secrets/`, `vault/`, `*.secret`
- Pre-commit hook: `git-secrets` or equivalent must scan all staged files before commit
- If a secret is accidentally committed: rotate the credential immediately; use `git filter-repo` to purge from history; force-push; notify all collaborators to re-clone

### Permitted in this repository

- Tier 2 non-sensitive platform configuration (agent YAML structure, workflow diagrams, architecture docs — no credentials, no PII)
- Tier 3 content (public documentation, public case summaries, public advocacy resources)
- Code, scripts, and automation that references secrets by environment variable name only
- `.env.example` files with placeholder values only

---

## Retention and Destruction

### Retention schedule

| Data type | Tier | Minimum retention | Maximum retention | Notes |
|---|---|---|---|---|
| Complainant PII and raw evidence | 0 | Life of matter + applicable statute of limitations | Life of matter + 7 years (or as directed by supervising attorney) | Longer if subject to litigation hold |
| Attorney–client communications | 0 | Life of matter + 7 years | Per supervising attorney direction | Never destroy if litigation is pending or reasonably anticipated |
| Platform credentials and keys | 0 | Until rotated | Until rotated | Rotate on any suspected exposure; old credentials destroyed immediately on rotation |
| Case research memos (matter-specific) | 1 | Life of matter + 3 years | Life of matter + 7 years | |
| De-identified research outputs | 2 | Life of matter | Life of matter + 5 years | |
| OSINT and actor research reports | 2 | 5 years from creation | 10 years | Retain longer if subject to active litigation hold |
| Published case summaries | 3 | Indefinite while matter is active | Archive per platform archival policy | |
| Public advocacy resources | 3 | Indefinite | Archive or update as law changes | |
| MCAS event and audit logs | 1–2 | 7 years | Indefinite | Logs are never destroyed if subject to litigation hold |
| AgenticMail draft and send logs | 1 | 3 years | 7 years | |
| Sol QA reports | 2 | Life of the publication they approve | 7 years | |

### Litigation hold

When a matter is subject to pending or reasonably anticipated litigation, all data associated with that matter is placed on **litigation hold**. Litigation hold:
- Suspends all scheduled destruction for affected data.
- Is applied by a human operator in MCAS (Matter record — `litigation_hold: true`).
- Cannot be removed by any agent.
- Is lifted only by a human operator, with a logged reason.

### Destruction procedure

| Medium | Method |
|---|---|
| Proton Drive (Tier 0 documents) | Proton Drive permanent delete; confirm deletion in Proton interface |
| MCAS database records | Logical delete + physical purge after retention period; audit log entry retained |
| OpenRAG index entries | Index entry removal + vector purge; confirm via OpenRAG admin |
| Open Notebook documents | Workspace deletion with audit log |
| Git repository content | `git filter-repo` for accidental commits; standard delete + commit for permitted content |
| Physical media | Cross-cut shredding (documents); NIST SP 800-88 secure erase (drives) |

---

## Incident and Breach Obligations

### What constitutes a data incident

- Tier 0 or Tier 1 data committed to the git repository in any branch
- Tier 0 or Tier 1 data ingested into a SearXNG index, OpenRAG pipeline, or any agent-accessible system
- Tier 0 or Tier 1 data transmitted to any external service, API, or unauthorized recipient
- Credential or key material exposed in any medium
- Unauthorized access to MCAS, OpenRAG, or Proton Drive
- Agent action that bypasses a required HITL gate
- Any actual or suspected re-identification of a complainant, survivor, witness, or minor

### Response procedure

1. **Contain immediately** — remove or revoke access to the exposed data; rotate any exposed credentials.
2. **Assess scope** — determine which Tier of data was affected, what systems it touched, and whether any external party received it.
3. **Notify** — report to the designated human operator via Proton Mail (Tier-0 channel) within 24 hours of discovery.
4. **Remediate** — purge exposed data from all systems; git history scrub if applicable; audit all affected agent logs.
5. **Document** — produce an incident record in MCAS (Tier 1; not in the public repository) covering: discovery timestamp, scope, containment actions, remediation steps, and corrective measures.
6. **Review** — conduct a post-incident review within 14 days; update this policy or platform controls as indicated.

### Regulatory and legal notification

If the incident involves personal data of Montana residents, the notification requirements of the **Montana Consumer Data Privacy Act (MCDPA)** and any applicable federal privacy statutes must be assessed by the supervising attorney. This policy does not substitute for legal counsel on breach notification obligations.

---

## Policy Maintenance

- This policy is reviewed **annually** or upon any material change to platform architecture, agent roster, or applicable law.
- Proposed amendments are drafted by the human operator team and committed to `main` via pull request with a descriptive commit message referencing the version and change summary.
- The version number follows `MAJOR.MINOR.PATCH` (semantic versioning): MAJOR for structural changes to Tier definitions or controls; MINOR for new agent entries or system additions; PATCH for clarifications and corrections.
- All contributors must re-acknowledge the updated policy via the process defined in [`docs/legal/ethics_policy.md §13`](../docs/legal/ethics_policy.md#13-acknowledgment) within 30 days of a MAJOR or MINOR version increment.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
