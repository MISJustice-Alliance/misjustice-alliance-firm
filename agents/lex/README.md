# Lex — Lead Counsel / Senior Analyst

> **MISJustice Alliance Firm · `agents/lex/`**
> Platform layer: 4 — Agent Runtime · Role type: `specialist` · Facing: `internal`
> Crew assignment: LegalResearchCrew / StrategyCrew

[![Agent Version](https://img.shields.io/badge/version-0.2.0-blue)](./agent.yaml)
[![SOUL.md](https://img.shields.io/badge/SOUL.md-v0.1.0-purple)](./SOUL.md)
[![Framework](https://img.shields.io/badge/framework-LangChain%20%2B%20LangSmith-green)](https://docs.smith.langchain.com/agent-builder)
[![Data Tier](https://img.shields.io/badge/data%20tier-T1--T2-yellow)](./POLICY.md)

---

Lex is the **Lead Counsel and Senior Analyst** for the MISJustice Alliance Firm. Lex synthesizes legal research, case patterns, and procedural data into strategic insights that support advocacy planning, policy development, and systemic change initiatives. Lex operates as a specialist within the LegalResearchCrew and StrategyCrew, producing evidence-based reports, systemic trend analyses, risk assessments, and cross-case comparisons.

Lex is **not** an autonomous decision-maker, a human attorney, or a public-facing agent. All outputs are strictly factual, cite sources, and carry mandatory disclaimers. Lex does not provide legal advice, recommend actions, or predict outcomes.

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
| **Systemic Pattern Analysis** | Identifies systemic patterns in constitutional violations across cases and jurisdictions |
| **Jurisdictional Trend Mapping** | Maps jurisdictional trends and disparities in legal outcomes |
| **Procedural Forecasting** | Forecasts procedural risks and opportunities based on historical patterns |
| **Evidence-Based Reporting** | Creates evidence-based reports for advocacy, policy, and systemic reform |
| **Cross-Case Comparison** | Compares and benchmarks cases across jurisdictions and time periods |
| **Risk Assessment** | Assesses systemic and procedural risks for matters under review |
| **Data Classification Check** | Ensures all outputs comply with ZHC Firm Data Classification Policy |
| **Source Attribution** | Credits all sources with proper legal citations |

---

## Platform Position

Lex sits at **Layer 4 — Agent Runtime** of the MISJustice Alliance Firm platform stack. Lex receives structured research tasks from OpenClaw, performs analysis using bound tools, and returns structured outputs to the orchestration layer.

```

Human Operator (via Hermes)
↓
OpenClaw / NemoClaw  →  crewAI Crews  →  Lex (LegalResearchCrew / StrategyCrew)
↓
Tools: MCAS · MCP (cases_get, citations_resolve) · OpenRAG · LawGlance
MemoryPalace · n8n

```

Lex is a **crewAI crew member**. It participates in crew execution under the Orchestrator agent within each crew.

---

## Crew Assignment

| Crew | Role | Workflow |
|---|---|---|
| **LegalResearchCrew** | Senior Analyst | `research_workflow` — legal research, precedent analysis, statutory interpretation |
| **StrategyCrew** | Lead Analyst | `strategy_workflow` — systemic pattern analysis, policy briefs, risk assessment |

Lex does not dispatch tasks to other agents. Task delegation is handled by the crew Orchestrator.

---

## Data Tier

Lex operates under a **Tier-1 to Tier-2 classification ceiling**.

| Tier | Label | Lex Access |
| :-- | :-- | :-- |
| Tier-0 | EYES-ONLY | **Never** — Tier-0 never enters the agent pipeline |
| Tier-1 | RESTRICTED | **Read-only** via MCAS and MCP tools with explicit staff approval required for citation or reproduction |
| Tier-2 | INTERNAL | **Read/write** — de-identified working data, matter summaries, task outputs |
| Tier-3 | PUBLIC-SAFE | Read-only for research context; Lex does not publish directly |

Lex must escalate immediately if any analysis contains **Restricted** or **Confidential** data without explicit staff approval.

---

## Tool Bindings

All tools are LangChain `BaseTool` subclasses bound at agent initialization. Runtime enforcement is via Paperclip policy (`lex_policy.paperclip.yaml`).

| Tool | Description | Confirmation Required |
|---|---|---|
| `MatterReadTool` | Read matter metadata and non-sensitive summaries from MCAS | No |
| `DocumentReadTool` | Read document contents and metadata from MCAS | No |
| `AuditLogWriteTool` | Write structured audit events to the OpenClaw audit stream | No |
| `mcp_cases_get` | Retrieve case law, dockets, and filings via MCP | No |
| `mcp_citations_resolve` | Resolve and validate legal citations via MCP | No |

---

## Denied Tools

The following tools are **explicitly denied** to Lex and enforced by Paperclip policy:

| Tool | Reason |
|---|---|
| `mcas_write_matter` / `mcas_write_person` | Matter and person writes require Avery + HITL gate |
| `mcas_delete_any` | All deletions require human authorization |
| `mcas_read_tier0` | Tier-0 never enters the agent pipeline |
| `agenticmail_send` / `proton_send` | External comms require dedicated agents + HITL |
| `gitbook_publish` | Publication requires Sol + Webmaster + HITL |
| `social_post_any` | Social posting requires Social Manager + HITL |
| `searxng_any` | Direct web search is not in Lex's tool set; research retrieval via MCP only |

---

## LLM Configuration

| Parameter | Value |
|---|---|
| Provider | LiteLLM proxy |
| Primary model | `claude-3-5-sonnet` |
| Fallback model | `gpt-4o` |
| Local fallback | `ollama / llama3` (auto-activates when external LLM unreachable) |
| Temperature | `0.2` (precision and consistency over creativity) |
| Max tokens | `8192` |
| Streaming | Enabled |
| Tracing | LangSmith (`misjustice-alliance-firm` project) |

---

## Quickstart

### Launch via OpenClaw (Production)

Lex is spawned by the crew Orchestrator within a crew workflow. It is not launched directly by operators.

```
Operator → Hermes → OpenClaw → LegalResearchCrew → Orchestrator → Lex
```

### Local Development / Testing

```bash
# Run Lex in isolated mode for testing
python -m agents.lex.main --config agents/lex/config.yaml --task-file test_task.json
```

### Test Task Format

```json
{
  "task_type": "systemic_pattern_analysis",
  "matter_id": "MCAS-0015",
  "scope": "search and seizure patterns in 9th Circuit urban districts 2015–2024",
  "jurisdictions": ["9th Circuit"],
  "output_format": "systemic_pattern_report"
}
```

---

## I/O Contracts

### Input Schema

Lex accepts structured task payloads from OpenClaw with the following schema:

```json
{
  "task_id": "TASK-XXXX",
  "matter_id": "MCAS-XXXX",
  "task_type": "systemic_pattern_analysis | jurisdictional_trend_mapping | procedural_forecasting | evidence_based_reporting | cross_case_comparison | risk_assessment",
  "scope": "plain-language scope summary",
  "jurisdictions": ["optional list of jurisdictions"],
  "data_sources": ["courtlistener", "pacer", "arweave", "neo4j"],
  "purpose": "advocacy | policy | internal_review",
  "restrictions": ["optional data use restrictions"],
  "authorized_by": "operator-handle",
  "hitl_gates_expected": ["research_scope_authorization"]
}
```

### Output Schema

Lex returns structured analysis outputs:

```json
{
  "task_id": "TASK-XXXX",
  "matter_id": "MCAS-XXXX",
  "output_type": "systemic_pattern_report | jurisdictional_trend_report | risk_assessment | cross_case_comparison",
  "classification": "PUBLIC | CONFIDENTIAL | RESTRICTED",
  "sections": {
    "context": "...",
    "findings": ["..."],
    "implications": "...",
    "data_sources": ["..."],
    "limitations": "...",
    "escalation_recommendation": "..."
  },
  "citations": [
    {"type": "case", "citation": "Miranda v. Arizona, 384 U.S. 436"},
    {"type": "statute", "citation": "42 U.S.C. § 1983"}
  ],
  "produced_at": "ISO8601",
  "disclaimer": "NOT LEGAL ADVICE — This output is produced by an AI research agent..."
}
```

---

## Observability & Audit

All Lex activity is traced via **LangSmith** and streamed to the **OpenClaw audit log**, which feeds into the **Veritas** compliance monitor.

### Audited Events

`task_received` · `analysis_started` · `data_source_queried` · `analysis_completed` · `output_delivered` · `escalation_triggered` · `policy_conflict_surfaced` · `hard_limit_invoked` · `citation_validated` · `classification_checked`

---

## File Reference

```

agents/lex/
├── README.md              ← This file
├── SOUL.md                ← Persistent identity constitution (load at init)
├── agent.yaml             ← Authoritative runtime configuration (Paperclip-registered)
├── system_prompt.md       ← Operational instructions and behavioral rules
├── SPEC.md                ← Engineering specification
├── MEMORY.md              ← Memory architecture and schemas
├── tools.yaml             ← Tool registry with full schemas
├── models.yaml            ← LLM model registry and inference configuration
├── config.yaml            ← Runtime environment configuration
├── POLICY.md              ← Behavioral and operational policy
├── GUARDRAILS.yaml        ← Runtime guardrail definitions
├── EVALS.yaml             ← Evaluation suites
├── RUNBOOK.md             ← Operations and incident response runbook
├── METRICS.md             ← SLIs, dashboards, alerts
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
| **Review cycle** | Every 90 days, or on major platform architecture change |
| **Change process** | Changes to behavioral constraints, tool access, HITL gate config, hard limits, or data tier require: (1) corresponding SOUL.md review and update, (2) human operator approval before merge to `main`, (3) Lex reinitialization after merge |
| **Supersedes** | N/A (initial full-directory version) |

---

*Lex — MISJustice Alliance Firm · Lead Counsel / Senior Analyst*
*Not an attorney. Not autonomous. Not a replacement for human judgment.*
