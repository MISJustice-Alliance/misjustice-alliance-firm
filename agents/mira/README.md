# Mira — Legal Researcher / Telephony & Messaging Specialist

> **MISJustice Alliance Firm · `agents/mira/`**
> Platform layer: 4 — Agent Runtime · Role type: `specialist` · Facing: `internal`
> Crew assignment: LegalResearchCrew / CommunicationsCrew

[![Agent Version](https://img.shields.io/badge/version-0.2.0-blue)](./agent.yaml)
[![SOUL.md](https://img.shields.io/badge/SOUL.md-v0.1.0-purple)](./SOUL.md)
[![Framework](https://img.shields.io/badge/framework-LangChain%20%2B%20LangSmith-green)](https://docs.smith.langchain.com/agent-builder)
[![Data Tier](https://img.shields.io/badge/data%20tier-T1--T3-yellow)](./POLICY.md)

---

Mira is the **Legal Researcher and Telephony & Messaging Specialist** for the MISJustice Alliance Firm. Mira coordinates legal research tasks including case retrieval, statute search, and citation resolution, while also managing compliant outbound and inbound communications across phone, SMS, and secure messaging channels.

Mira is **not** an autonomous decision-maker, a human attorney, or a public-facing broadcaster. All communications are consent-based, privacy-minimizing, and auditable. Mira does not provide legal advice, impersonate humans, or autonomously send messages.

---

## Table of Contents

1. [Role & Responsibilities](#role--responsibilities)
2. [Platform Position](#platform-position)
3. [Crew Assignment](#crew-assignment)
4. [Data Tier](#data-tier)
5. [Tool Bindings](#tool-bindings)
6. [Denied Tools](#denied-tools)
7. [LLM Configuration](#llm-configuration)
8. [Quickstart](#quickstart)
9. [I/O Contracts](#io-contracts)
10. [Observability & Audit](#observability--audit)
11. [File Reference](#file-reference)
12. [Governance](#governance)

---

## Role & Responsibilities

| Responsibility | Description |
|---|---|
| **Legal Research** | Retrieve case law, statutes, and legal precedents via MCP and web search |
| **Citation Resolution** | Validate and canonicalize legal citations |
| **Statute Search** | Search statutory databases for relevant provisions |
| **Message Drafting** | Draft compliant outbound messages with tone control and compliance checks |
| **Scheduling Coordination** | Draft scheduling and confirmation messages |
| **Intake Questionnaire Design** | Design structured, non-leading intake questionnaires |
| **Consent & Opt-Out Tracking** | Maintain audit trail of consent, opt-outs, and delivery status |
| **Crisis Triage** | Escalate urgent or sensitive matters to humans or appropriate agents |

---

## Platform Position

Mira sits at **Layer 4 — Agent Runtime** of the MISJustice Alliance Firm platform stack. Mira receives structured tasks from OpenClaw within crew workflows.

```

Human Operator (via Hermes)
↓
OpenClaw / NemoClaw  →  crewAI Crews  →  Mira (LegalResearchCrew / CommunicationsCrew)
↓
Tools: MCAS · MCP (cases_get, statutes_search, citations_resolve) · SearXNG · n8n

```

---

## Crew Assignment

| Crew | Role | Workflow |
|---|---|---|
| **LegalResearchCrew** | Legal Researcher | `research_workflow` — case retrieval, statute search, citation validation |
| **CommunicationsCrew** | Messaging Specialist | `communications_workflow` — message drafting, scheduling, intake design |

---

## Data Tier

Mira operates under a **Tier-1 to Tier-3 classification ceiling**.

| Tier | Label | Mira Access |
| :-- | :-- | :-- |
| Tier-0 | EYES-ONLY | **Never** |
| Tier-1 | RESTRICTED | **Read-only with approval gate** for legal research; never in SMS |
| Tier-2 | INTERNAL | **Read/write** for research and messaging context |
| Tier-3 | PUBLIC-SAFE | **Read/write** for outbound communications and published research |

Mira must never send **Restricted** or **Confidential** data via SMS. All messages must include the correct classification tag.

---

## Tool Bindings

All tools are LangChain `BaseTool` subclasses bound at agent initialization.

| Tool | Description | Confirmation Required |
|---|---|---|
| `MatterReadTool` | Read matter metadata from MCAS | No |
| `DocumentReadTool` | Read document contents from MCAS | No |
| `mcp_cases_get` | Retrieve case law via MCP | No |
| `mcp_statutes_search` | Search statutory databases via MCP | No |
| `mcp_citations_resolve` | Resolve and validate citations via MCP | No |
| `SearXNGWrapper` | Web search via SearXNG for legal research | No |

---

## Denied Tools

The following tools are **explicitly denied** to Mira:

| Tool | Reason |
|---|---|
| `mcas_write_matter` / `mcas_write_person` | Matter writes require Avery + HITL |
| `mcas_delete_any` | Deletions require human authorization |
| `mcas_read_tier0` | Tier-0 never enters agent pipeline |
| `agenticmail_send` | External comms require Casey + HITL |
| `proton_send` | Tier-0 comms are human-only |
| `gitbook_publish` | Publication requires Sol + Webmaster + HITL |
| `social_post_any` | Social posting requires Social Manager + HITL |
| `messaging_gateway` | Disabled by default; requires explicit enablement |
| `telephony_gateway` | Disabled by default; requires explicit enablement |

---

## LLM Configuration

| Parameter | Value |
|---|---|
| Provider | LiteLLM proxy |
| Primary model | `claude-3-5-sonnet` |
| Fallback model | `gpt-4o` |
| Local fallback | `ollama / llama3` |
| Temperature | `0.1` (very low — precision and consistency) |
| Max tokens | `4096` |
| Streaming | Enabled |
| Tracing | LangSmith (`misjustice-alliance-firm` project) |

---

## Quickstart

### Launch via OpenClaw (Production)

Mira is spawned by the crew Orchestrator within a crew workflow.

```
Operator → Hermes → OpenClaw → LegalResearchCrew → Orchestrator → Mira
```

### Local Development / Testing

```bash
python -m agents.mira.main --config agents/mira/config.yaml --task-file test_task.json
```

### Test Task Format (Research)

```json
{
  "task_type": "statute_search",
  "matter_id": "MCAS-0015",
  "scope": "Search Montana statutes on qualified immunity",
  "jurisdictions": ["Montana"],
  "output_format": "statute_summary"
}
```

### Test Task Format (Messaging)

```json
{
  "task_type": "draft_sms",
  "matter_id": "MCAS-0015",
  "purpose": "scheduling",
  "channel": "sms",
  "recipient_consent": "opt-in",
  "content_classification": "PUBLIC"
}
```

---

## I/O Contracts

### Input Schema

```json
{
  "task_id": "TASK-XXXX",
  "matter_id": "MCAS-XXXX",
  "task_type": "case_retrieval | statute_search | citation_resolution | draft_sms | draft_email | intake_design",
  "scope": "plain-language scope",
  "jurisdictions": ["optional"],
  "channel": "sms | email | voicemail | secure_messaging",
  "consent_status": "opt-in | prior_relationship | staff-approved",
  "content_classification": "PUBLIC | CONFIDENTIAL | RESTRICTED",
  "authorized_by": "operator-handle",
  "hitl_gates_expected": ["research_scope_authorization"]
}
```

### Output Schema (Research)

```json
{
  "task_id": "TASK-XXXX",
  "matter_id": "MCAS-XXXX",
  "output_type": "case_summary | statute_list | citation_validation",
  "classification": "PUBLIC | CONFIDENTIAL | RESTRICTED",
  "results": ["..."],
  "citations": ["..."],
  "produced_at": "ISO8601",
  "disclaimer": "NOT LEGAL ADVICE..."
}
```

### Output Schema (Messaging)

```json
{
  "task_id": "TASK-XXXX",
  "matter_id": "MCAS-XXXX",
  "output_type": "message_draft | voicemail_script | intake_questionnaire",
  "recommended_text": "...",
  "channel_notes": "...",
  "consent_opt_out_notes": "...",
  "classification": "PUBLIC | CONFIDENTIAL | RESTRICTED",
  "escalation_recommendation": "...",
  "produced_at": "ISO8601"
}
```

---

## Observability & Audit

All Mira activity is traced via **LangSmith** and streamed to the **OpenClaw audit log**.

### Audited Events

`task_received` · `research_started` · `cases_retrieved` · `statutes_searched` · `citations_resolved` · `message_drafted` · `escalation_triggered` · `policy_conflict_surfaced` · `consent_checked` · `opt_out_recorded`

---

## File Reference

```

agents/mira/
├── README.md              ← This file
├── SOUL.md                ← Persistent identity constitution
├── agent.yaml             ← Authoritative runtime configuration
├── system_prompt.md       ← Operational instructions
├── SPEC.md                ← Engineering specification
├── MEMORY.md              ← Memory architecture
├── tools.yaml             ← Tool registry
├── models.yaml            ← LLM model registry
├── config.yaml            ← Runtime configuration
├── POLICY.md              ← Behavioral and operational policy
├── GUARDRAILS.yaml        ← Runtime guardrails
├── EVALS.yaml             ← Evaluation suites
├── RUNBOOK.md             ← Operations runbook
├── METRICS.md             ← SLIs and alerts
├── memory/                ← Memory working directory
├── evals/                 ← Evaluation artifacts
└── logs/                  ← Runtime logs

```

---

## Governance

| Field | Value |
|---|---|
| **Agent version** | `0.2.0` |
| **SOUL.md version** | `0.1.0` |
| **Effective date** | 2026-04-16 |
| **Review cycle** | Every 90 days |
| **Change process** | PR review + HOB approval + SOUL.md sync + reinitialization |
| **Supersedes** | N/A |

---

*Mira — MISJustice Alliance Firm · Legal Researcher / Telephony & Messaging Specialist*
*Not an attorney. Not autonomous. Not a replacement for human judgment.*
