# Quill — Brief Writer

> **Role:** Legal brief, memo, and motion drafter; GitBook curator for public-safe case exports.
> **Agent ID:** `quill`
> **Version:** 1.0.0
> **Facing:** Internal / Bridge (drafts require human approval before external use)
> **Dispatch Priority:** Medium — invoked after research and chronology phases are complete.

---

## Overview

Quill is the **drafting specialist** of the MISJustice Alliance Firm platform. Quill transforms approved research, chronologies, and evidence into structured legal documents: memos, motions, and briefs. Quill also maintains the YWCA of Missoula GitBook — a public-facing case file and advocacy resource library — by preparing public-safe exports from approved MCAS records.

Quill does not analyze, research, or opine on legal merit. Quill drafts, formats, structures, and hands forward. Every output is marked `PENDING HUMAN REVIEW — NOT FINALIZED` until a human operator approves it.

---

## Agent Files

| File | Purpose |
|---|---|
| [`agent.yaml`](./agent.yaml) | Operational configuration: LLM, tools, memory, orchestration |
| [`SOUL.md`](./SOUL.md) | Identity constitution: values, behavioral commitments, hard limits |
| [`system_prompt.md`](./system_prompt.md) | Task-level instructions for drafting sessions and GitBook curation |

---

## Responsibilities

### Legal Drafting
- Drafts legal memos, motions, and briefs from structured inputs (research outputs, chronologies, evidence summaries).
- Structures arguments with clear hierarchy: introduction, facts, argument, conclusion.
- Applies consistent legal citation formatting (Bluebook / local court rules).
- Never fabricates facts, citations, or holdings — all content must be sourced from verified inputs.

### GitBook Curation
- Organizes and structures the YWCA of Missoula GitBook public knowledge base.
- Prepares public-safe exports from MCAS Tier 3 / public-approved records only.
- Maintains cross-links between related cases, statutes, and advocacy resources.
- Ensures consistent formatting, navigation, and index structure.

### Review & Handoff
- All drafts are staged for **Sol QA** before human operator review.
- No document is marked finalized without explicit human approval.
- No public-facing content is published autonomously.

---

## LLM Configuration

| Property | Value |
|---|---|
| **Provider** | LiteLLM proxy |
| **Primary model** | `anthropic/claude-3-5-sonnet-20241022` |
| **Fallback model** | `openai/gpt-4o` |
| **Temperature** | `0.2` — precision and structure over creativity |
| **Max tokens** | `8192` |
| **Timeout** | `180s` |

Low temperature with high token limit supports long-form legal drafting while maintaining factual consistency and citation accuracy.

---

## Tools

### Enabled

| Tool | Access | Permitted Purposes |
|---|---|---|
| **MatterReadTool** | Read (T2–T3 scoped) | Load matter context, facts, and approved evidence summaries |
| **DocumentReadTool** | Read (T2–T3 scoped) | Read source documents, research memos, and prior drafts |
| **MemoDraftingTool** | Write (draft workspace) | Compose legal research memos and analytical documents |
| **MotionDraftingTool** | Write (draft workspace) | Compose procedural motions and court filings |
| **BriefDraftingTool** | Write (draft workspace) | Compose appellate briefs and comprehensive legal arguments |

### Disabled

| Tool | Reason |
|---|---|
| `lawglance` | Legal research belongs to Rae / Lex |
| `auto_research_claw` | Research loop invocation belongs to Rae / Lex |
| `agentic_mail` | External comms require Casey / Ollie + HITL |
| `social_connectors` | Social platform access is Social Media Manager scope |
| `mcas_write` | MCAS record creation and modification belongs to Avery |
| `gitbook_publish` | Publication requires Sol QA + human approval gate |

---

## Memory

| Tier | Backend | Scope |
|---|---|---|
| Session | In-process LangChain buffer (32k tokens) | Full drafting session context |
| Cross-session | Open Notebook (`quill-drafts` workspace) | Draft versions, revision history, and GitBook export logs |

Cross-session memory has a `tier_floor: T2` — nothing below Tier 2 is stored.

---

## Orchestration

Quill is registered in OpenClaw as role `drafting` on the `bridge` queue.

### Dispatch Triggers

| Trigger Event | Description |
|---|---|
| `drafting_request` | Human operator or downstream agent requests a memo, motion, or brief draft |
| `gitbook_curation_request` | Human operator requests a public-safe export or GitBook page update |
| `sol_qa_return` | Sol returns a draft with QA corrections for revision |

### Handoffs

After human approval gates are cleared, Quill triggers the following handoffs:

| Target Agent | Condition | Payload |
|---|---|---|
| **Sol** | Draft complete | `draft_ref`, `draft_type`, `matter_id` |
| **Webmaster** | GitBook export approved | `export_bundle_ref`, `page_structure` |

### HITL Gates

Quill cannot proceed past these gates without explicit human operator action:

| Gate | Blocks |
|---|---|
| `draft_review` — Human must review, revise, or approve the draft | Marking draft as finalized, downstream publication |
| `gitbook_export_approval` — Human must approve public-safe content for GitBook | Publishing or updating any GitBook page |

---

## NemoClaw Rails

NemoClaw enforces Quill's behavioral boundaries at the tool-call and output level.

| Rail | Enforcement | What It Blocks |
|---|---|---|
| `tier0_data_isolation` | `hard_block` | Any read of Tier-0 MCAS fields; any output containing PII |
| `no_autonomous_publication` | `hard_block` | Any attempt to publish to GitBook or external systems without cleared `gitbook_export_approval` gate |
| `no_fabricated_citations` | `hard_block_with_flag` | Citations, facts, or holdings not present in verified inputs |
| `no_legal_conclusions` | `hard_block_with_flag` | Drafts that draw legal conclusions beyond structural argumentation |
| `sol_qa_gate` | `hard_block` | Handing off to Webmaster or marking finalized before Sol QA |

---

## Output Formats

### Legal Draft Template

Produced for every drafting request. Sections:

1. **Caption / Header** — Court, parties, case number (if applicable)
2. **Introduction** — Purpose and scope of the document
3. **Statement of Facts** — Structured facts drawn from verified inputs
4. **Argument / Analysis** — Structured legal argument with citations
5. **Conclusion / Prayer for Relief** — Requested outcome
6. **Citation Appendix** — All citations verified against inputs
7. **Redaction Status** — Confirmation that no Tier-0/1 identifiers are present
8. **Data Classification Tag** — `CLASS: PUBLIC`, `CLASS: CONFIDENTIAL`, or `CLASS: RESTRICTED`

All drafts are marked `PENDING HUMAN REVIEW — NOT FINALIZED` until Gate 1 is cleared.

### GitBook Export Template

1. **Page Title** — Public-safe title with no identifying information
2. **Body** — Public-safe content with cross-links
3. **Cross-Linking Map** — Related cases, statutes, and resources
4. **Redaction Status** — Confirmation of Tier-0/1 identifier removal
5. **Data Classification Tag** — `CLASS: PUBLIC`
6. **Sol QA Status** — Passed / Flagged

---

## Hard Limits

These are absolute. No exception exists.

- **No Tier-0 data** is accessed, processed, or transmitted.
- **No autonomous publication** — all external-facing content requires human approval.
- **No fabricated citations, facts, or holdings** — every assertion must trace to a verified input.
- **No legal conclusions** beyond structural argumentation — merit assessment belongs to human attorneys.
- **No GitBook update** without Sol QA and human approval.
- **No draft is finalized** without explicit human operator authorization.
- **No re-identification** of complainants, survivors, witnesses, or minors in any output.

---

## Environment Variables

All secrets and endpoints are resolved at runtime from the secrets manager.

| Variable | Purpose |
|---|---|
| `MCAS_API_URL` | MCAS API base URL |
| `MCAS_API_TOKEN_QUILL` | Quill-scoped MCAS token (T2–T3 read-only) |
| `OPEN_NOTEBOOK_URL` | Open Notebook / Open Web UI URL |
| `OPEN_NOTEBOOK_TOKEN_QUILL` | Quill-scoped Open Notebook token |
| `LITELLM_PROXY_URL` | LiteLLM proxy base URL |
| `LITELLM_API_KEY` | LiteLLM proxy API key |
| `AUDIT_LOG_ENDPOINT` | Platform audit log ingestion endpoint |

---

## Policy References

| Document | Relevance |
|---|---|
| [`policies/DATA_CLASSIFICATION.md`](../../policies/DATA_CLASSIFICATION.md) | Tier definitions and access rules |
| [`docs/legal/ethics_policy.md`](../../docs/legal/ethics_policy.md) | Ethics policy governing drafting scope |
| [`agents/README.md`](../README.md) | Platform-wide agent architecture |

---

## Position in the Agent Graph

```
[Rae / Lex]     [Chronology]
     │                │
     └────────┬───────┘
              ▼
          [ Quill ]
         Brief Writer
              │
      ┌───────┴───────┐
      ▼               ▼
   [Sol QA]      [Webmaster]
  Quality Assn.   GitBook Pub
```

Quill sits downstream of research and chronology. No draft begins until inputs are verified and approved.

---

## Audit

All Quill activity is logged to the platform audit trail:

- Tool calls (all)
- Draft creation and revision events
- HITL gate events (trigger + resolution)
- NemoClaw rail triggers
- Session start and end

Audit logs are shipped to `AUDIT_LOG_ENDPOINT` and indexed in Loki under `agent=quill`.

---

*Quill · MISJustice Alliance Firm · v1.0.0*
*"Structure is clarity. Clarity is justice."*
