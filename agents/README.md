# MISJustice Alliance Firm — Agent Roster

> **Directory:** `agents/`  
> **Orchestration:** OpenClaw / NemoClaw  
> **Policy references:** [`docs/legal/ethics_policy.md`](../docs/legal/ethics_policy.md) · [`policies/DATA_CLASSIFICATION.md`](../policies/DATA_CLASSIFICATION.md) · [`policies/SEARCH_TOKEN_POLICY.md`](../policies/SEARCH_TOKEN_POLICY.md) · [`policies/OSINT_USE_POLICY.md`](../policies/OSINT_USE_POLICY.md)  
> **Platform overview:** [`README.md`](../README.md)

This directory defines the full agent staff of the MISJustice Alliance Firm platform. Each agent is a bounded role with a defined scope, search permission tier, tool set, and list of systems it may access. Agents operate under the OpenClaw / NemoClaw orchestration layer and are subject to the human-in-the-loop governance model defined in [`README.md §4`](../README.md#4-human-in-the-loop-governance).

---

## Table of Contents

- [Orchestration Layer](#orchestration-layer)
- [Search Permission Tiers](#search-permission-tiers)
- [Agent Directory](#agent-directory)
  - [Avery — Intake & Evidence](#avery--intake--evidence)
  - [Mira — Telephony & Messaging](#mira--telephony--messaging)
  - [Rae — Paralegal Researcher](#rae--paralegal-researcher)
  - [Lex — Senior Analyst](#lex--senior-analyst)
  - [Iris — PI / Public Records Researcher](#iris--pi--public-records-researcher)
  - [Chronology Agent](#chronology-agent)
  - [Citation / Authority Agent](#citation--authority-agent)
  - [Casey — Counsel Scout](#casey--counsel-scout)
  - [Atlas — Case Lifecycle Coordinator](#atlas--case-lifecycle-coordinator)
  - [Veritas — Internal Integrity Monitor](#veritas--internal-integrity-monitor)
  - [Ollie — Outreach Coordinator](#ollie--outreach-coordinator)
  - [Webmaster](#webmaster)
  - [Social Media Manager](#social-media-manager)
  - [Sol — Public Content QA](#sol--public-content-qa)
  - [Quill — GitBook Curator](#quill--gitbook-curator)
  - [Vane — Operator Search Interface](#vane--operator-search-interface)
- [Agent File Structure Convention](#agent-file-structure-convention)
- [HITL Gate Summary](#hitl-gate-summary)

---

## Orchestration Layer

All agents are dispatched, monitored, and governed through the **OpenClaw / NemoClaw** orchestration stack:

| Component | Function |
|---|---|
| **OpenClaw** | Central task router and multi-agent dispatcher; manages delegation chains, queuing, tool invocation, and session context |
| **NemoClaw** | Sandbox and protection layer; enforces scope boundaries, blocks prohibited tool calls, and logs all agent actions |
| **AgenticMail** | Approval queue and outbound messaging infrastructure; all external communications route through AgenticMail for human review before dispatch |

Agents never communicate directly with external parties, public APIs, or other agents outside of explicitly defined tool channels. All inter-agent coordination is brokered through OpenClaw.

---

## Search Permission Tiers

All agent search traffic is routed through the private SearXNG instance. Each agent is assigned a search tier that defines which engine groups and index scopes it may access. Token names correspond to the environment variable names defined in [`policies/SEARCH_TOKEN_POLICY.md`](../policies/SEARCH_TOKEN_POLICY.md). Agents never query SearXNG directly or call commercial search APIs.

| Tier | Token env var | Agents | Engine groups accessible |
|---|---|---|---|
| **T1** — Public-Safe | `SEARXNG_TOKEN_PUBLIC` | Sol, Quill, Mira, Webmaster, Social Media Manager | Public legal databases, curated public web, public-safe internal summaries |
| **T1** — Public-Safe | `SEARXNG_TOKEN_PUBLIC` | Ollie | T1 + internal-safe MCAS / OpenRAG search |
| **T2** — Restricted | `SEARXNG_TOKEN_RESTRICTED` | Avery, Rae, Lex, Casey | T1 + restricted internal indexes, bar/court registries, attorney/org research |
| **T3** — PI-Tier | `SEARXNG_TOKEN_PI` | Iris | T2 + OSINT / public-record specialty engines (institutional actors only) |
| **T4** — Admin | Human operators only (incl. via Vane) | N/A | All engines, diagnostic and admin views |
| **None** | — | Avery (intake only), Atlas, Veritas | No search; read-only platform data or monitoring access |

> **Note:** The T0/T1/T2/T3/T4 naming used in earlier versions of this document has been harmonized with [`policies/SEARCH_TOKEN_POLICY.md`](../policies/SEARCH_TOKEN_POLICY.md). The canonical tier names and token env vars are T1–T3 as defined in that policy. The T4 admin tier (Vane / human operators) is not a SearXNG token; it is direct operator access.

Full engine group definitions and token issuance/rotation policy: [`policies/SEARCH_TOKEN_POLICY.md`](../policies/SEARCH_TOKEN_POLICY.md)

---

## Agent Directory

---

### Avery — Intake & Evidence

```
agents/avery/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Internal |
| **Search tier** | T2 — `SEARXNG_TOKEN_RESTRICTED` (internal MCAS/OpenRAG scope only) |
| **HITL gates** | Intake acceptance; Tier classification of uploaded evidence |

**Role:** Avery is the platform's front door. Every new matter, piece of evidence, and complainant intake enters the system through Avery. Avery creates the foundational MCAS records that all downstream agents work from.

**Scope:**
- Structured intake creation from human-provided information, uploaded documents, and telephony summaries.
- Document ingestion: OCR, format normalization, metadata extraction, and classification.
- Tier assignment proposals for all incoming material (final Tier classification requires human approval).
- Chain-of-custody record creation for evidence items.
- Initial Person, Organization, Matter, and Event record creation in MCAS.

**Specialty:** Intake triage, document classification, OCR processing, evidence chain-of-custody.

**Permissions:**
- Read/write: MCAS (Person, Organization, Matter, Event, Document models)
- Read: OpenRAG (to check for duplicate or related prior records)
- Search: T2 internal-safe MCAS/OpenRAG scope
- No access to: LawGlance, AutoResearchClaw, AgenticMail outbound, social platforms, any Tier-0 pipeline

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| MCAS API | Read / Write | Create and update Person, Matter, Event, Document records |
| Chandra OCR | Write (submit) | Extract text from PDF and image evidence |
| OpenRAG | Read | Duplicate and related-matter detection |
| SearXNG (T2 — internal scope) | Search | Internal-safe document and record search |
| Open Web UI / Open Notebook | Write | Draft intake summaries for human review |

---

### Mira — Telephony & Messaging

```
agents/mira/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Internal |
| **Search tier** | T1 — `SEARXNG_TOKEN_PUBLIC` |
| **HITL gates** | All external communications (Mira drafts only; AgenticMail queues for human approval) |

**Role:** Mira handles the platform's telephony and messaging layer — transcribing calls, parsing incoming messages, producing structured triage notes, and routing communication events into MCAS.

**Scope:**
- Inbound call transcription and structured summarization.
- Incoming message parsing and triage note generation.
- MCAS Event creation for telephony and messaging contacts.
- Routing communication summaries to the appropriate agent or human operator.
- Draft outbound message composition for human review (never autonomous send).

**Specialty:** Call transcription, message parsing, communication triage, contact-event logging.

**Permissions:**
- Read/write: MCAS (Event model); write new communication-origin Events
- Write: AgenticMail (draft queue only — human approval required before any send)
- Search: T1 — public-safe only
- No access to: LawGlance, AutoResearchClaw, OpenRAG (write), social platforms, Tier-0 pipeline

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| Telephony bridge | Read (stream) | Receive and transcribe inbound calls |
| AgenticMail | Write (draft queue) | Draft outbound communications for human approval |
| MCAS API | Write | Log communication events and contact summaries |
| SearXNG (T1 — public-safe) | Search | Public-safe context lookups for triage notes |

---

### Rae — Paralegal Researcher

```
agents/rae/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Internal |
| **Search tier** | T2 — `SEARXNG_TOKEN_RESTRICTED` |
| **HITL gates** | Research scope authorization; referral packet review |

**Role:** Rae is the platform's primary legal researcher. She conducts multi-stage research loops using AutoResearchClaw, retrieves public legal information via LawGlance, assembles case chronologies, and builds the factual and legal foundation for Lex's analysis.

**Scope:**
- Statute and case law retrieval across US federal, Montana, and Washington State jurisdictions.
- Case chronology drafting from MCAS Event records.
- Legal element matrices for § 1983 claims, malpractice, and related civil rights theories.
- Referral support: drafting background sections of referral packets for Casey.
- Citation assembly and handoff to the Citation / Authority Agent for verification.
- Querying LawGlance for abstract legal questions about public statutory standards.

**Specialty:** Legal research, statute retrieval, chronology assembly, civil rights law, §§ 1983/1985/1988, Montana and Washington State procedural law.

**Permissions:**
- Read: MCAS (Matter, Event, Document — Tier 2 de-identified scope)
- Read/write: OpenRAG (ingest research outputs; query prior research)
- Tool: AutoResearchClaw (multi-stage research loops)
- Tool: LawGlance (public legal info RAG — abstract legal questions only; no case facts or PII)
- Search: T2 — restricted internal + public legal engines (CourtListener, Free Law, CAP)
- Write: Open Notebook (research memos, chronologies, element matrices)
- No access to: AgenticMail outbound, social platforms, Tier-0 pipeline, OSINT/PI engines

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| MCAS API | Read | Retrieve de-identified Matter, Event, Document records for research |
| OpenRAG | Read / Write | Query prior research; ingest new research outputs |
| AutoResearchClaw | Tool (invoke) | Multi-stage autonomous legal research loops |
| LawGlance | Tool (query) | Public statutory and case law retrieval (abstract questions only) |
| SearXNG (T2 — restricted) | Search | Restricted internal + public legal source search |
| CourtListener / Free Law API | Search (via SearXNG) | Federal docket and case law retrieval |
| Caselaw Access Project (CAP) | Search (via SearXNG) | Historical case law |
| Open Notebook | Write | Research memos, chronologies, element matrices |

---

### Lex — Senior Analyst

```
agents/lex/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Internal |
| **Search tier** | T2 — `SEARXNG_TOKEN_RESTRICTED` |
| **HITL gates** | Pattern-of-practice publication; external referral packet approval |

**Role:** Lex is the platform's senior analytical layer — the QA and legal theory engine. Lex reviews Rae's research, maps legal issues, develops § 1983 and malpractice theories, identifies patterns of practice across matters, and verifies analytical outputs before they advance to external use.

**Scope:**
- Legal issue mapping and theory development (§ 1983, Monell, qualified immunity, ADA, VAWA).
- Quality assurance and fact-check of Rae's research memos and chronologies.
- Risk analysis: SOL assessments, evidentiary gap analysis, claim viability.
- Pattern-of-practice identification across matters and actors.
- Comparative statutory analysis using LawGlance.
- Draft verification before any output advances to Casey, Webmaster, or external recipients.

**Specialty:** Civil rights legal theory, § 1983 / Monell doctrine, qualified immunity, malpractice analysis, pattern-of-practice, multi-matter synthesis, QA.

**Permissions:**
- Read: MCAS (Matter, Event, Document, Pattern flags — Tier 2 scope; Tier 1 with explicit operator grant)
- Read/write: OpenRAG
- Tool: AutoResearchClaw
- Tool: LawGlance (comparative statutory and doctrinal analysis — abstract questions only)
- Search: T2 — restricted internal + selected court/attorney registries + public legal
- Read/write: Open Notebook
- No access to: AgenticMail outbound, social platforms, OSINT/PI engines, Tier-0 pipeline

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| MCAS API | Read | Matter, Event, Document, and pattern flag records |
| OpenRAG | Read / Write | Legal research retrieval and analysis output ingestion |
| AutoResearchClaw | Tool (invoke) | Deep legal analysis and verification research loops |
| LawGlance | Tool (query) | Comparative statutory and doctrinal analysis |
| SearXNG (T2 — restricted) | Search | Restricted internal indexes + public legal engines |
| CourtListener / Free Law API | Search (via SearXNG) | Case law and docket research |
| Open Notebook | Read / Write | Analysis memos, issue maps, QA notes |

---

### Iris — PI / Public Records Researcher

```
agents/iris/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Internal |
| **Search tier** | T3 — `SEARXNG_TOKEN_PI` |
| **HITL gates** | Human Gate 1 required before any PI-tier query; full query logging and audit per session |

**Role:** Iris is the platform's investigator. She researches public officials, law enforcement agencies, prosecutors, courts, shelters, and other institutional actors using OSINT and public records. Iris never investigates private individuals who are not acting in an official institutional capacity. See [`policies/OSINT_USE_POLICY.md`](../policies/OSINT_USE_POLICY.md) for the full OSINT authorization framework.

**Scope:**
- OSINT research on named public officials and public institutions.
- Public records retrieval: court records, FOIA responses, police department records, shelter governance documents.
- Cross-jurisdiction actor and agency linking (Montana, Washington State, federal).
- Officer history, disciplinary records, and complaint history research.
- Agency organizational structure and oversight chain mapping.
- Pattern-of-practice evidence gathering for Lex.
- Conflict-of-interest institutional relationship research in support of Casey (Workflow D).

**Specialty:** OSINT, public-record retrieval, law enforcement background research, institutional investigation, cross-jurisdiction actor mapping, misconduct database research.

**Permissions:**
- Read: MCAS (actor and agency fields only — Tier 2 scope; explicit denied person types per `agent.yaml`)
- Read/write: OpenRAG (OSINT findings)
- Tool: AutoResearchClaw
- Search: T3 — PI/OSINT specialty engines, public records databases, all T1–T2 sources
- Write: Open Notebook
- No access to: LawGlance, AgenticMail outbound, social platforms, Tier-0 pipeline
- **Prohibited:** Investigation of complainants, survivors, witnesses, minors, or any private individual not acting in an official institutional capacity

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| MCAS API | Read (actor fields only) | Actor, agency records for research context |
| OpenRAG | Read / Write | OSINT findings ingestion and retrieval |
| AutoResearchClaw | Tool (invoke) | Multi-stage OSINT and public records research loops |
| SearXNG (T3 — PI) | Search | OSINT and public-records specialty engines + all T1–T2 sources |
| Open Notebook | Write | PI research reports, agency profiles, actor timelines, pattern memos |

---

### Chronology Agent

```
agents/chronology/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Internal |
| **Search tier** | T2 — `SEARXNG_TOKEN_RESTRICTED` (internal scope) |
| **HITL gates** | Human review of all chronology outputs before use in referral packets or publication |

**Role:** The Chronology Agent transforms raw MCAS event records, research memos, and document summaries into ordered, annotated event timelines. Its output is a primary input for referral packets, legal memos, and published case files.

**Scope:**
- Reading MCAS Event records and ordering them into narrative timelines.
- Applying reliability and source-type tags to each event.
- Flagging inconsistencies, gaps, and disputed events.
- Producing litigation-ready chronology documents in Open Notebook.
- Cross-referencing events with legal standards identified by Rae / Lex.

**Specialty:** Event-to-timeline assembly, reliability tagging, litigation-ready chronology formatting, evidentiary gap flagging.

**Permissions:**
- Read: MCAS (Event, Document, Matter models — Tier 2 de-identified scope)
- Read: OpenRAG (research memos and Rae/Lex outputs)
- Write: Open Notebook
- Search: T2 — internal-safe scope
- No access to: LawGlance, AutoResearchClaw, AgenticMail outbound, social platforms, Tier-0 pipeline

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| MCAS API | Read | Event, Document, and Matter records for timeline assembly |
| OpenRAG | Read | Research memos and analytical context |
| Open Notebook | Write | Litigation-ready chronology documents |
| SearXNG (T2 — internal scope) | Search | Internal-safe context and reference lookups |

---

### Citation / Authority Agent

```
agents/citation_authority/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Internal |
| **Search tier** | T2 — `SEARXNG_TOKEN_RESTRICTED` (`public_legal` engine group) |
| **HITL gates** | None autonomous — supports Rae, Lex, and publication pipeline; flagged citations require human resolution |

**Role:** The Citation / Authority Agent is the platform's fact-checker for legal sources. Every citation, statutory reference, and case holding produced by any other agent must pass through the Citation Agent before inclusion in any external-facing output.

**Scope:**
- Fetch-and-verify of cited statutes, regulations, and case holdings against primary sources.
- Cross-referencing citations against CourtListener, Free Law Project, CAP, and LawGlance.
- Flagging unverified, ambiguous, or hallucinated citations.
- Updating Open Notebook research outputs with verified citation status.
- Maintaining a session-scoped citation verification log.

**Specialty:** Citation verification, primary authority cross-reference, hallucination detection in legal citations, statute and case law fetch-and-verify.

**Permissions:**
- Read: OpenRAG (outputs from Rae, Lex for citation extraction)
- Tool: LawGlance (public legal info fetch — abstract questions only)
- Search: T2 — `public_legal` engine group (CourtListener, Free Law, CAP, DOJ open data)
- Read/write: Open Notebook (citation verification annotations)
- No access to: MCAS write, AgenticMail outbound, social platforms, OSINT engines, Tier-0 pipeline

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| OpenRAG | Read | Extract citations from Rae/Lex research outputs |
| LawGlance | Tool (query) | Statutory text and case holding verification |
| SearXNG (T2 — public_legal) | Search | Primary source fetch and verification |
| CourtListener / Free Law API | Search (via SearXNG) | Case law and docket verification |
| Caselaw Access Project (CAP) | Search (via SearXNG) | Historical case law verification |
| DOJ Open Data | Search (via SearXNG) | Federal regulatory and enforcement records |
| Open Notebook | Read / Write | Citation verification annotations and status logs |

---

### Casey — Counsel Scout

```
agents/casey/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Bridge (Internal → External prep) |
| **Search tier** | T2 — `SEARXNG_TOKEN_RESTRICTED` (+ `osint_public` for attorney/org research) |
| **HITL gates** | Human review and explicit authorization required before any referral packet is transmitted |

**Role:** Casey bridges the internal research pipeline and external legal resources. She researches civil rights attorneys and advocacy organizations, evaluates fit for specific matters, and assembles referral packets for human review and transmission. OSINT research on referral candidates is governed by [`policies/OSINT_USE_POLICY.md`](../policies/OSINT_USE_POLICY.md) § `osint_public`.

**Scope:**
- Law firm and attorney research: civil rights practice, § 1983 experience, Montana / Washington bar membership.
- Civil rights organization research: ACLU, Innocence Project affiliates, state legal aid, federal public defender offices.
- Bar association lookup and attorney disciplinary record checks.
- Conflict-of-interest assessment for referral candidates (institutional relationship research via Iris Workflow D).
- Referral packet assembly: export from MCAS + Lex/Rae memos + Casey cover memo, drafted for human review.
- No autonomous transmission of any referral packet.

**Specialty:** Civil rights attorney research, bar registry lookup, referral packet assembly, advocacy organization mapping, conflict-of-interest assessment.

**Permissions:**
- Read: MCAS (Matter, Document export API — Tier 2 de-identified scope; export requires human authorization)
- Read: OpenRAG
- Search: T2 restricted + `osint_public` engine group for attorney/org research only
- Write: Open Notebook (referral memos, attorney profiles)
- Write: AgenticMail (draft queue only — human must authorize before send)
- No access to: LawGlance, AutoResearchClaw, social platforms, Tier-0 pipeline, PI/OSINT specialty engines beyond `osint_public`

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| MCAS API | Read (export API) | De-identified Matter/Document exports for referral packets |
| OpenRAG | Read | Rae/Lex research for referral packet content |
| SearXNG (T2 + osint_public) | Search | Attorney, bar, org research + restricted internal indexes |
| Open Notebook | Write | Referral memos, attorney profiles, org summaries |
| AgenticMail | Write (draft queue) | Referral packet drafts for human approval before transmission |

---

### Atlas — Case Lifecycle Coordinator

```
agents/atlas/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Internal |
| **Search tier** | None — no search access |
| **HITL gates** | Missed deadlines; uncoordinated agent actions; incomplete case status — all escalate to human |

**Role:** Atlas is the platform's case lifecycle coordinator. It owns the end-to-end case journey: tracking status, managing deadlines, orchestrating agent workflow sequences, and triggering human review gates at key milestones. Atlas does not make legal decisions and never reads Tier 0 or Tier 1 material. Atlas observes and coordinates; humans decide.

**Scope:**
- Case status tracking across all active matters in MCAS.
- Deadline management: SOL tracking, filing deadlines, referral follow-up timelines.
- Agent workflow orchestration: sequencing task handoffs between Avery → Rae → Lex → Iris → Casey → Ollie per matter type.
- Human review gate triggering: escalating to the operator queue at defined milestones and when anomalies are detected.
- Case lifecycle reporting: status summaries for human operators.

**Specialty:** Case lifecycle management, deadline tracking, workflow orchestration, milestone-based HITL escalation.

**Permissions:**
- Read: MCAS (Matter, Event, status fields — Tier 2 scope; no Tier 0/1 access)
- Write: MCAS (status and milestone fields only)
- Write: Open Notebook (case status reports)
- Tool: n8n webhooks (escalation and approval-required triggers)
- No legal decisions; no data storage beyond status fields; no search access
- No access to: OpenRAG, LawGlance, AgenticMail outbound, social platforms, Tier-0 pipeline

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| MCAS API | Read / Write (status fields) | Case status, deadline, and milestone tracking |
| Open Notebook | Write | Case lifecycle status reports for human review |
| n8n webhooks | Write (trigger) | Human escalation and approval-required notifications |

---

### Veritas — Internal Integrity Monitor

```
agents/veritas/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Internal (Compliance / Audit) |
| **Search tier** | None — no search access; audit log access only |
| **HITL gates** | Policy violations; data leakage; Tier 0/1 unauthorized access; misclassification — all escalate immediately to Human Oversight Board |

**Role:** Veritas is the platform's internal integrity monitor and compliance auditor. It observes agent behavior, audits data flows, detects policy violations, and reports to the Human Oversight Board. Veritas never acts — it observes and reports only. It cannot modify data, override policies, or take autonomous action of any kind.

**Scope:**
- Continuous monitoring of agent behavior against platform policies and NemoClaw rail definitions.
- Data classification audit: verifying that data handled by agents is classified and routed per [`policies/DATA_CLASSIFICATION.md`](../policies/DATA_CLASSIFICATION.md).
- Policy violation detection: flagging any agent action that breaches defined constraints.
- Audit trail generation: maintaining a complete, tamper-evident log of monitored events.
- Integrity reporting: producing structured violation and compliance reports for the Human Oversight Board.

**Specialty:** Agent behavior monitoring, data classification audit, policy violation detection, audit trail generation, compliance reporting.

**Permissions:**
- Read: Platform audit log (all tiers — read-only; no write or delete)
- Read: Agent session logs (metadata and action records; no raw Tier 0/1 content)
- Write: Integrity reports to Human Oversight Board queue
- Tool: n8n webhooks (escalation triggers)
- **No action authority of any kind.** Veritas cannot modify records, override NemoClaw rails, approve or deny actions, or instruct other agents.
- **No data storage.** Veritas reads and reports; it does not persist data outside of integrity reports.

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| Platform audit log | Read-only | Agent action and event monitoring |
| n8n webhooks | Write (trigger) | Violation escalation to Human Oversight Board |
| Open Notebook | Write | Integrity and compliance reports |

> **Run context:** Veritas uses local inference (`local/ollama`) for all analysis. No audit data is transmitted to external model providers.

---

### Ollie — Outreach Coordinator

```
agents/ollie/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Bridge (Internal → External draft) |
| **Search tier** | T1 — `SEARXNG_TOKEN_PUBLIC` |
| **HITL gates** | All external outreach drafts require human approval via AgenticMail before send |

**Role:** Ollie drafts and routes external outreach — correspondence with oversight bodies, government agencies, advocacy organizations, and media contacts. Ollie never sends independently; every outreach message is queued for human approval.

**Scope:**
- Template-based outreach drafts: oversight complaint cover letters, FOIA request letters, media inquiry responses, advocacy org introductions.
- AgenticMail queue management: organizing and routing drafts to the correct approval channel.
- MCAS event logging for all outreach activities.
- Context-aware drafting using public-safe search for relevant contact and context lookups.

**Specialty:** Outreach drafting, correspondence templates, oversight complaint letters, FOIA request drafting, agency contact management.

**Permissions:**
- Read: MCAS (Matter, Event, Person/Organization contact records — Tier 2 scope)
- Write: AgenticMail (draft queue only)
- Write: MCAS (outreach Event logging)
- Search: T1 — public-safe
- No access to: LawGlance, AutoResearchClaw, OpenRAG (write), social platforms, Tier-0 pipeline

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| MCAS API | Read / Write | Contact records, Matter context, outreach event logging |
| AgenticMail | Write (draft queue) | Outreach drafts for human approval |
| SearXNG (T1 — public-safe) | Search | Contact and context lookups for drafting |

---

### Webmaster

```
agents/webmaster/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Bridge → External |
| **Search tier** | T1 — `SEARXNG_TOKEN_PUBLIC` |
| **HITL gates** | All page publications require human approval of final text, redaction, and indexing decision |

**Role:** The Webmaster manages all public web properties — `misjusticealliance.org`, the YWCA of Missoula GitBook case library, and any future sites. Webmaster stages pages, applies redaction checks, manages SEO/GEO, and publishes only after human approval.

**Scope:**
- Content staging and publication pipeline for `misjusticealliance.org`.
- GitBook structure management: page organization, index maintenance, cross-linking.
- Redaction verification: ensuring all Tier 0/1 identifiers are removed before publication.
- SEO and GEO (Generative Engine Optimization) markup and metadata.
- Sitemap and robots.txt management.
- Sol QA handoff: routing staged content to Sol for fact-check before human approval.

**Specialty:** Web publication pipeline, redaction verification, SEO/GEO, CMS/static site management, GitBook structure.

**Permissions:**
- Read: MCAS (Tier 3 / public-approved exports only)
- Read: Open Notebook (approved, human-reviewed content only)
- Write: misjusticealliance.org CMS / static site tools
- Write: GitBook API
- Search: T1 — public-safe only
- No access to: MCAS Tier 0/1/2 records, OpenRAG private indexes, LawGlance, AgenticMail outbound, Tier-0 pipeline

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| MCAS API | Read (Tier 3 exports) | Approved, redacted public-facing content exports |
| Open Notebook | Read | Human-approved research outputs for publication |
| Open Web UI | Write | Content staging and publication pipeline |
| GitBook API | Read / Write | YWCA of Missoula GitBook structure and page management |
| SearXNG (T1 — public-safe) | Search | Public-safe context and reference lookups |
| CMS / static site tools | Write | misjusticealliance.org page and sitemap management |

---

### Social Media Manager

```
agents/social_media_manager/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | External |
| **Search tier** | T1 — `SEARXNG_TOKEN_PUBLIC` |
| **HITL gates** | Human review and approval required for all posts alleging misconduct against identifiable actors; all campaign sequences require human approval |

**Role:** The Social Media Manager manages MISJustice Alliance's public presence across X, Bluesky, Reddit, Nostr, and other platforms. It drafts, sequences, and — after human approval — posts campaign content and monitors engagement.

**Scope:**
- Platform post drafting: X, Bluesky, Reddit, Nostr.
- Campaign sequencing: coordinated multi-platform content calendars.
- Audience and engagement monitoring.
- Reputation and response monitoring for MISJustice Alliance-related content.
- Handoff to Sol for fact-check before any post alleging misconduct advances to human approval.

**Specialty:** Social platform posting, campaign sequencing, multi-platform content distribution, engagement monitoring, brand reputation.

**Permissions:**
- Read: Open Notebook (approved, human-reviewed content)
- Write: X, Bluesky, Reddit, Nostr connectors (after human approval only)
- Read/write: Open Notebook (campaign drafts, engagement logs)
- Search: T1 — public-safe only
- No access to: MCAS, OpenRAG, LawGlance, AgenticMail outbound, Tier-0/1/2 data

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| Open Notebook | Read / Write | Approved content input; campaign draft storage |
| X (Twitter) connector | Write (post — human-approved) | Platform posting |
| Bluesky connector | Write (post — human-approved) | Platform posting |
| Reddit connector | Write (post — human-approved) | Platform posting |
| Nostr connector | Write (post — human-approved) | Platform posting |
| SearXNG (T1 — public-safe) | Search | Public-safe context and platform monitoring |

---

### Sol — Public Content QA

```
agents/sol/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Bridge → External |
| **Search tier** | T1 — `SEARXNG_TOKEN_PUBLIC` |
| **HITL gates** | Sol's QA report is a required input to the human approval gate for all public publications; human resolves all flagged items before publication proceeds |

**Role:** Sol is the platform's final quality assurance gate before any content reaches public web properties or social platforms. Sol fact-checks, source-verifies, redaction spot-checks, and accuracy-reviews all public-facing outputs from Webmaster and Social Media Manager. Sol does not approve content autonomously — it produces a QA report that is a required input to the human approval decision. Sol is a QA specialist, not a community liaison or public-facing communicator; it operates entirely inside the internal approval pipeline.

**Scope:**
- Fact-check and source verification for all content staged for public publication.
- Citation accuracy review: confirming that cited public sources say what they are claimed to say.
- Redaction spot-check: flagging any apparent Tier 0/1 identifiers that survived earlier redaction stages.
- Accuracy review of statutory and case law characterizations in public content.
- Data classification check: confirming all content meets Tier 3 / public-approved classification before publication.
- Producing a structured QA report that accompanies every staged publication for human review.
- Escalating ambiguous, inaccurate, incomplete, or high-sensitivity content to the human operator queue.

**Specialty:** Fact-checking, source verification, citation accuracy, redaction spot-check, statute and case law accuracy review, public content QA reporting.

**Permissions:**
- Read: Open Notebook (staged publication content)
- Read: MCAS (Tier 3 / public-approved exports only — for redaction verification)
- Search: T1 — `SEARXNG_TOKEN_PUBLIC` (public-safe source fetch and citation verification only)
- Read: OpenRAG (public-safe view — approved summaries only)
- Write: Open Notebook (QA reports)
- **No autonomous approval authority.** Sol produces QA reports; humans make publish decisions.
- No access to: MCAS Tier 0/1/2, AgenticMail outbound, social platform write, Tier-0 pipeline, internal-restricted or PI-tier engine groups

**Escalation triggers (route to human operator queue):**
- Source inaccurate or misrepresented
- Citation incorrect or mischaracterized
- Redaction check failed (Tier 0/1 identifier detected)
- Content ambiguous, incomplete, or editorially unclear
- High-profile or sensitive matter content
- Any operator request for autonomous publish approval

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| Open Notebook | Read / Write | Staged content review; QA report output |
| MCAS API | Read (Tier 3 exports) | Redaction verification against approved public exports |
| OpenRAG | Read (public-safe view) | Approved summary retrieval for fact-check context |
| SearXNG (T1 — public-safe) | Search | Public source fetch and citation verification |

---

### Quill — GitBook Curator

```
agents/quill/
├── README.md
├── SPEC.md
├── SOUL.md
├── agent.yaml
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md               
├── system_prompt.md         
├── memory/                  
├── evals/                   
└── logs/
```

| Field | Value |
|---|---|
| **Facing** | Bridge → External |
| **Search tier** | T1 — `SEARXNG_TOKEN_PUBLIC` |
| **HITL gates** | All new GitBook pages or structural changes require human approval |

**Role:** Quill maintains the YWCA of Missoula GitBook — the public case file and advocacy resource library. Quill organizes documents, maintains the index structure, creates cross-links, and prepares public-safe exports from approved MCAS outputs.

**Scope:**
- GitBook page organization, hierarchy, and index maintenance.
- Cross-linking related case files, statutes, and advocacy resources.
- Public-safe export preparation from approved MCAS document records.
- Content formatting and style consistency for the GitBook library.
- Handoff to Sol for QA before any new page is submitted for human approval.

**Specialty:** GitBook structure and curation, document organization, public-safe export preparation, cross-linking, knowledge base maintenance.

**Permissions:**
- Read: MCAS (Tier 3 / public-approved exports only)
- Read/write: GitBook API
- Read: Open Notebook (approved, human-reviewed content)
- Search: T1 — public-safe only
- No access to: MCAS Tier 0/1/2, OpenRAG private indexes, LawGlance, AgenticMail outbound, Tier-0 pipeline

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| MCAS API | Read (Tier 3 exports) | Approved document exports for GitBook content |
| GitBook API | Read / Write | GitBook page structure, index, and content management |
| Open Notebook | Read | Human-approved content for GitBook publication |
| SearXNG (T1 — public-safe) | Search | Public-safe reference and cross-link lookups |

---

### Vane — Operator Search Interface

> **Note:** Vane is a **human operator interface**, not an autonomous agent. It is listed here for completeness as it is the operator-facing layer that sits atop the SearXNG instance used by the agent stack.

```
services/vane/          ← configuration lives here, not in agents/
```

| Field | Value |
|---|---|
| **Facing** | Internal (Human-facing only) |
| **Search tier** | T4 — Admin (direct operator access; not a SearXNG token) |
| **HITL gates** | N/A — Vane is operated directly by humans; it is not an autonomous agent |

**Role:** Vane provides operators with a Perplexity-style conversational research workspace that queries the private SearXNG instance. It supports ad-hoc research, document upload and Q&A, image and video search, domain-scoped queries, and cited multi-mode research sessions.

**Scope:**
- Operator ad-hoc research: cited web Q&A over the private SearXNG instance.
- Document upload and Q&A (Tier-2/3 material only — see security note).
- Multi-mode research depth: Speed / Balanced / Quality.
- Image and video search.
- Domain-scoped and topic-scoped search sessions.
- Search history and session management.
- Output to Open Notebook.

**Specialty:** Conversational operator research, cited Q&A, multi-source synthesis, document Q&A.

**Security note:** Vane's file upload feature must **not** be used with Tier-0 or Tier-1 material until upstream authentication and role-based access control are implemented. Vane uses direct admin access to all SearXNG engine groups.

**Systems accessed:**
| System | Access type | Purpose |
|---|---|---|
| SearXNG (admin — direct) | Search (all engines) | Full-access operator research |
| Ollama / local LLM | Inference | Local LLM-backed Q&A and synthesis |
| Open Notebook | Write | Operator research output export |

---

## Agent File Structure Convention

Each agent subdirectory follows this standard layout:

```
agents/{agent-name}/
├── SOUL.md           # Agent identity constitution: persistent personality, values, boundaries,
│                    #   tone, and behavioral commitments that persist across all sessions.
├── agent.yaml        # Role configuration: tool bindings, search tier token, MCAS API scope,
│                    #   LLM model selection, temperature, memory config, and OpenClaw wiring.
└── system_prompt.md  # Operational system prompt: task framing, allowed/prohibited actions,
                     #   output format expectations, and handoff protocols.
```

**`SOUL.md`** defines the agent's persistent identity — who it is, what it values, and what it will not do — independently of any specific task or session. It is the ethical and behavioral foundation that all other configuration inherits from.

**`agent.yaml`** is the operational configuration that wires the agent to the platform: which tools it can call, which search tier token it uses, which MCAS API scopes are granted, and how it is registered in OpenClaw.

**`system_prompt.md`** is the task-level instruction set: what the agent does in a given session, what it produces, and how it hands off to the next stage.

---

## HITL Gate Summary

The following table summarizes the human-in-the-loop approval gates that apply to each agent. Gates are enforced by OpenClaw / NemoClaw and cannot be bypassed by any agent or automated process. See [`README.md §4`](../README.md#4-human-in-the-loop-governance) and [`docs/legal/ethics_policy.md §5`](../docs/legal/ethics_policy.md#5-ai-agent-ethics-and-autonomy-limits) for full policy.

| Agent | Gate | Required human action |
|---|---|---|
| **Avery** | New matter intake | Approve / defer / reject; confirm Tier for uploaded evidence |
| **Avery** | Evidence Tier classification | Human confirms Tier before MCAS record is finalized |
| **Rae** | Research scope | Human defines scope before AutoResearchClaw is invoked |
| **Lex** | Pattern-of-practice finding | Human reviews and approves language before inclusion in any output |
| **Iris** | PI-tier research scope (Gate 1) | Human authorizes target, role, matter ID, and research purpose before T3 search begins |
| **Iris** | Research memo release (Gate 2) | Human reviews and releases memo before OpenRAG ingest or downstream agent handoff |
| **Iris** | FOIA submission (Gate 3) | Human authorizes before any FOIA request is submitted |
| **Casey** | Referral packet transmission | Human reviews, edits, and explicitly authorizes before send |
| **Atlas** | Missed deadline escalation | Human resolves cause and authorizes corrective action |
| **Atlas** | Uncoordinated agent action | Human reviews and clears before workflow resumes |
| **Veritas** | Policy violation detected | Human Oversight Board reviews violation report and determines response |
| **Veritas** | Tier 0/1 unauthorized access detected | Immediate escalation; Human Oversight Board determines response |
| **Ollie** | Any external communication | Human reviews and approves all outreach drafts via AgenticMail |
| **Webmaster** | Web publication | Human approves final text, redaction, and indexing decision |
| **Social Media Manager** | Posts alleging misconduct against identifiable actors | Human reviews and approves before post |
| **Social Media Manager** | Campaign sequences | Human approves full campaign sequence |
| **Sol** | Flagged QA item | Human resolves all Sol-flagged items before publication proceeds |
| **Quill** | New GitBook pages or structural changes | Human approval required |

---

## Case Lifecycle Diagram

```mermaid
graph TD
    A[Case Intake<br>Anonymous Portal / Webhook] --> B{Case Classification<br>Severity: Critical/High/Medium/Low}
    B -->|Critical/High| C[Trigger Sol QA Gate<br>→ Human Review]
    B -->|Medium/Low| D[Orchestrate Agent Stack<br>→ Rae → Lex → Casey → Ollie → Quill]
    D --> E[Human Review Gate<br>→ Approve/Revise]
    E --> F[Generate Referral Packet<br>→ Casey]
    F --> G[Human Approval<br>→ AgenticMail Queue]
    G --> H{Send?}
    H -->|Yes| I[Send via AgenticMail<br>→ External]
    H -->|No| J[Archive in MCAS<br>→ Arweave Permaweb]

    C --> K[Human Review<br>→ Sol QA Report]
    K --> L{Approve?}
    L -->|Yes| M[Generate Public Content<br>→ Webmaster → Sol → Human Review]
    L -->|No| N[Revise & Re-Submit]

    M --> O[Human Approval<br>→ Open Notebook]
    O --> P[Publish to <br>misjusticealliance.org<br>and GitBook]
    P --> Q[Social Media<br>→ Ollie → Sol → Human Review]
    Q --> R[Post via AgenticMail<br>→ X, Bluesky, Reddit, Nostr]

    S[Veritas Monitor<br>Internal Integrity] --> T[Agent Logs<br>Data Flow<br>Policy Compliance]
    T --> U{Violation Detected?}
    U -->|Yes| V[Escalate to<br>Human Oversight Board]
    U -->|No| W[Continue Monitoring]

    X[Atlas Coordinator<br>Case Lifecycle] --> Y[Case Status<br>Deadlines<br>Actions]
    Y --> Z[Trigger Human Review Gates<br>at Key Milestones]
    Z --> AA[Update Case Status<br>→ MCAS & Open Notebook]

    classDef human fill:#c084fc,stroke:#6d28d9,stroke-width:2px;
    classDef system fill:#93c5fd,stroke:#1d4ed8,stroke-width:2px;
    classDef audit fill:#fbb6ce,stroke:#d946ef,stroke-width:2px;

    class A,B,D,E,F,G,H,I,J,K,M,N,O,P,Q,R,S,T,W,X,Y,Z,AA system
    class C,K,L,O human
    class S,U,V audit
```

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
