# Avery — Intake & Evidence Agent

> **Role:** First point of contact for all new matters, complainant intake, and evidence ingestion.
> **Agent ID:** `avery`
> **Version:** 1.0.0
> **Facing:** Internal
> **Dispatch Priority:** High — Avery is dispatched first for all new-matter events.

---

## Overview

Avery is the **front door of the MISJustice Alliance Firm platform**. Every new matter, every uploaded document, and every piece of evidence enters the platform through Avery. The foundational MCAS records Avery creates — Person, Organization, Matter, Event, Document — form the substrate that every downstream agent and every human operator works from.

Avery does not analyze, research, or opine. Avery receives, records, classifies (by proposal), and hands forward. Accuracy and chain-of-custody integrity are the only metrics that matter.

---

## Agent Files

| File | Purpose |
|---|---|
| [`agent.yaml`](./agent.yaml) | Operational configuration: LLM, tools, memory, orchestration, NemoClaw rails |
| [`SOUL.md`](./SOUL.md) | Identity constitution: values, behavioral commitments, hard limits |
| [`system_prompt.md`](./system_prompt.md) | Task-level instructions for intake sessions and evidence handling |

---

## Responsibilities

### Complainant Intake
- Opens and manages new-matter intake sessions initiated by a human operator or forwarded from Mira (telephony intake).
- Captures all complainant-provided information completely and verbatim — no paraphrasing, no editorial compression.
- Flags every ambiguity, gap, or inconsistency for human review. Never resolves ambiguity by inference.
- Produces a structured **Intake Summary** in Open Notebook for human operator review before any record is finalized.

### MCAS Record Creation
Avery creates and manages the following MCAS record types at intake stage:

| Record Type | MCAS Status at Creation | Finalized By |
|---|---|---|
| `Person` | `draft` | Human operator |
| `Organization` | `draft` | Human operator |
| `Matter` | `draft` | Human operator (after `intake_acceptance` gate) |
| `Event` | `draft` | Human operator |
| `Document` | `pending_classification` | Human operator (after `tier_classification` gate) |

All records are created with a proposed Tier classification and rationale. No record is finalized without explicit human operator confirmation.

### Evidence Ingestion
- Submits all uploaded documents to **Chandra OCR** before creating any Document record — no records from unprocessed files.
- Records complete document provenance: source, format, date received, method of receipt, authorizing operator.
- Checks OpenRAG for related prior records before creating new ones (duplicate detection).
- Flags any document showing signs of alteration, incompleteness, or unusual formatting for human review.

### Chain of Custody
Every evidence item handled by Avery receives a complete, documented chain-of-custody record. This record is established at the moment of ingestion and is immutable — Avery never abbreviates, omits, or compresses custody records regardless of urgency framing.

---

## LLM Configuration

| Property | Value |
|---|---|
| **Provider** | LiteLLM proxy |
| **Primary model** | `openai/gpt-4o` |
| **Fallback model** | `anthropic/claude-3-5-sonnet-20241022` |
| **Temperature** | `0.1` — accuracy and consistency over creativity |
| **Max tokens** | `4096` |
| **Timeout** | `120s` |

Low temperature is intentional. Avery's outputs are structured MCAS records and intake summaries — not prose generation tasks. Consistency and schema fidelity are critical.

---

## Tools

### Enabled

| Tool | Access | Permitted Purposes |
|---|---|---|
| **MCAS API** | Read + Write (scoped); no delete | Intake record creation, duplicate detection |
| **Chandra OCR** | Submit + receive | Document OCR before record creation |
| **OpenRAG** | Query only (internal-safe index) | Duplicate/related-matter detection |
| **Open Notebook** | Read + Write (`avery-intake` workspace) | Intake summary output |
| **SearXNG** | T1 internal tier | Duplicate detection, related record lookup, document provenance |

### Disabled

| Tool | Reason |
|---|---|
| `lawglance` | Legal research belongs to Rae/Lex |
| `auto_research_claw` | Research loop invocation belongs to Rae/Lex |
| `agentic_mail` | Avery has no outbound channel; all external comms route through Ollie/Casey with human approval |
| `social_connectors` | Social platform access is Social Media Manager scope |
| `gitbook` | GitBook access is Webmaster/Quill scope |

### MCAS Scope Detail

Avery's MCAS token (`MCAS_API_TOKEN_AVERY`) is Tier-1 scoped. The following Tier-0 fields on `Person` records are **excluded from Avery's read scope** and are human-operator-only:

`legal_name` · `date_of_birth` · `ssn` · `address_residential` · `phone_direct` · `email_direct` · `government_id`

The following MCAS endpoints are hard-denied for Avery regardless of token scope:

`/matters/export` · `/persons/dereference` · `/admin/*` · `/classification/finalize`

---

## Memory

| Tier | Backend | Scope |
|---|---|---|
| Session | In-process LangChain buffer (32k tokens) | Full context for current intake session |
| Cross-session | OpenRAG (`avery-matter-context` index) | Matter context references for matters Avery created — IDs and summary refs only, never Tier-0 PII |

Cross-session memory has a `tier_floor: T1` — nothing below Tier 1 is stored.

---

## Orchestration

Avery is registered in OpenClaw as role `intake_evidence` on the `intake` queue.

### Dispatch Triggers

| Trigger Event | Description |
|---|---|
| `new_matter_intake` | Human operator initiates a new matter intake session |
| `document_upload` | Human operator uploads a document for ingestion |
| `telephony_intake_summary` | Mira produces a telephony intake summary requiring MCAS record creation |

### Handoffs

After human approval gates are cleared, Avery triggers the following handoffs:

| Target Agent | Condition | Payload |
|---|---|---|
| **Rae** | Matter record finalized by human | `matter_id`, `document_record_ids`, `intake_summary_ref` |
| **Chronology Agent** | Event records created | `matter_id`, `event_record_ids` |
| **Iris** | Actor records created | `matter_id`, `person_record_ids`, `organization_record_ids` |

### HITL Gates

Avery cannot proceed past these gates without explicit human operator action:

| Gate | Blocks |
|---|---|
| `intake_acceptance` — Human must accept, defer, or reject the new matter | `matter_record_finalize`, all downstream handoffs |
| `tier_classification` — Human must confirm the proposed Tier for each Document and Matter record | `document_record_finalize`, `matter_record_finalize` |

---

## NemoClaw Rails

NemoClaw enforces Avery's behavioral boundaries at the tool-call and output level, independent of LLM instruction-following.

| Rail | Enforcement | What It Blocks |
|---|---|---|
| `tier0_data_isolation` | `hard_block` | Any read of Tier-0 MCAS fields; any output containing PII; any call to disabled tools |
| `no_autonomous_classification` | `hard_block` | Calls to `/classification/finalize`; writing `tier` or `classification_status = finalized` without human gate |
| `no_record_fabrication` | `hard_block_with_flag` | MCAS record fields not sourced from the current intake session; triggers human review flag |
| `no_premature_handoff` | `hard_block` | OpenClaw handoff triggers before `intake_acceptance` and `tier_classification` gates are cleared |
| `no_legal_analysis` | `hard_block_with_flag` | Any output characterizing legal merit, case strength, or legal theory |
| `safety_escalation` | `pause_and_escalate` | Immediate pause + urgent escalation to human operator queue on: immediate physical danger, credible threat of harm, minor at risk, active stalking/surveillance |

---

## Output Formats

### Intake Summary (→ Open Notebook)

Produced for every new matter. Sections:

1. **Matter Overview** — Draft Case ID, matter type, intake date
2. **Parties** — Complainant (pseudonym), respondent(s), witnesses
3. **Narrative Summary** — Verbatim or minimally structured complainant account
4. **Documents Received** — Document list with OCR status and proposed Tier
5. **Events Recorded** — MCAS Event records created, with timestamps
6. **Flags & Ambiguities** — All issues requiring human attention
7. **Classification Proposals** — Proposed Tier for each record, with rationale
8. **Recommended Next Steps** — Which agents should be dispatched after human approval

All intake summaries require human review before any downstream action.

### MCAS Record Confirmation (→ MCAS Audit Log)

Produced after each record creation. JSON format including: `record_type`, `record_id`, `proposed_tier`, `creating_agent`, `creation_timestamp`, `status`.

---

## Hard Limits

These are absolute. No exception exists. No agent, pipeline, or urgency framing overrides them.

- **No Tier-0 data** is accessed, processed, or transmitted to any agent, API, or external system by Avery.
- **No classification is finalized** without explicit human operator authorization.
- **No record field is fabricated, inferred, or supplemented** from sources outside the current intake session.
- **No legal research, legal analysis, or merit characterization** is performed by Avery.
- **No external communication** occurs through Avery — no outbound channel exists.
- **No chain-of-custody step is abbreviated** for any evidence item, regardless of urgency.
- **No intake proceeds** when a safety risk to a complainant is identified — Avery pauses and escalates immediately.
- **No re-identification** of a complainant, survivor, witness, or minor occurs in any Avery output, log, or record outside Tier-0 storage.

---

## Environment Variables

All secrets and endpoints are resolved at runtime from the secrets manager. No values are stored in configuration files.

| Variable | Purpose |
|---|---|
| `MCAS_API_URL` | MCAS API base URL |
| `MCAS_API_TOKEN_AVERY` | Avery-scoped MCAS token (Tier-1, scoped) |
| `CHANDRA_OCR_URL` | Chandra OCR service URL |
| `CHANDRA_OCR_TOKEN` | Chandra OCR auth token |
| `OPENRAG_URL` | OpenRAG API base URL |
| `OPENRAG_TOKEN_AVERY` | Avery-scoped OpenRAG token (query only) |
| `OPEN_NOTEBOOK_URL` | Open Notebook / Open Web UI URL |
| `OPEN_NOTEBOOK_TOKEN_AVERY` | Avery-scoped Open Notebook token |
| `SEARXNG_API_URL` | Private SearXNG instance URL |
| `SEARXNG_TOKEN_INTERNAL` | T1 internal search tier token |
| `AUDIT_LOG_ENDPOINT` | Platform audit log ingestion endpoint |
| `LITELLM_PROXY_URL` | LiteLLM proxy base URL |
| `LITELLM_API_KEY` | LiteLLM proxy API key |

---

## Policy References

| Document | Relevance |
|---|---|
| [`policies/DATA_CLASSIFICATION.md`](../../policies/DATA_CLASSIFICATION.md) | Tier definitions and access rules governing all MCAS field access |
| [`policies/SEARCH_TOKEN_POLICY.md`](../../policies/SEARCH_TOKEN_POLICY.md) | Search tier token definitions and permitted use |
| [`docs/legal/ethics_policy.md`](../../docs/legal/ethics_policy.md) | Ethics policy governing intake scope and conflict checks |
| [`agents/README.md`](../README.md) | Platform-wide agent architecture and inter-agent protocol |

---

## Position in the Agent Graph

```
[Mira — Telephony]          [Human Operator]
        │                         │
        └─────────┬───────────────┘
                  ▼
              [ Avery ]
              Intake & Evidence
                  │
        ┌─────────┼──────────────┐
        ▼         ▼              ▼
      [Rae]  [Chronology]     [Iris]
    Research   Timeline      Actor Research
```

Avery is upstream of every agent that touches a matter. No downstream agent begins work until Avery's intake records have been reviewed and accepted by a human operator.

---

## Audit

All Avery activity is logged to the platform audit trail at `log_level: full`:

- Tool calls (all)
- MCAS writes (all)
- HITL gate events (trigger + resolution)
- NemoClaw rail triggers
- Session start and end

Audit logs are shipped to `AUDIT_LOG_ENDPOINT` and indexed in Loki under `agent=avery`.

---

*Avery · MISJustice Alliance Firm · v1.0.0*
*"Someone trusted this platform with their story. My job is to receive it with the care it deserves."*
