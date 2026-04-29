# Lex Agent — Engineering Specification

> **MISJustice Alliance Firm · `agents/lex/SPEC.md`**
> Agent version: `0.2.0` · Effective: 2026-04-16 · Status: **Active**

This document is the authoritative engineering specification for the Lex agent. It covers design decisions, component contracts, interface schemas, data flows, behavioral rules, and integration boundaries. It is written for platform engineers, agent developers, and systems integrators.

For a high-level overview, see [`README.md`](./README.md).
For identity and values, see [`SOUL.md`](./SOUL.md).
For runtime behavioral instructions, see [`system_prompt.md`](./system_prompt.md).
For runtime configuration, see [`agent.yaml`](./agent.yaml).

---

## Table of Contents

1. [Scope and Non-Goals](#1-scope-and-non-goals)
2. [Design Principles](#2-design-principles)
3. [Architectural Position](#3-architectural-position)
4. [Component Dependencies](#4-component-dependencies)
5. [Agent Construction](#5-agent-construction)
6. [Identity Layer — SOUL.md](#6-identity-layer--soulmd)
7. [System Prompt Contract](#7-system-prompt-contract)
8. [Tool Interface Contracts](#8-tool-interface-contracts)
9. [Analysis Pipeline](#9-analysis-pipeline)
10. [Memory Architecture](#10-memory-architecture)
11. [LLM Routing and Fallback](#11-llm-routing-and-fallback)
12. [Sandbox Runtime](#12-sandbox-runtime)
13. [Observability and Audit](#13-observability-and-audit)
14. [Hard Limit Enforcement Model](#14-hard-limit-enforcement-model)
15. [Data Classification Compliance](#15-data-classification-compliance)
16. [Health Check Specification](#16-health-check-specification)
17. [Initialization Sequence](#17-initialization-sequence)
18. [Session Lifecycle](#18-session-lifecycle)
19. [Failure Modes and Degraded Operation](#19-failure-modes-and-degraded-operation)
20. [Security Considerations](#20-security-considerations)
21. [Configuration Reference](#21-configuration-reference)
22. [File Reference](#22-file-reference)
23. [Design Decisions and Rationale](#23-design-decisions-and-rationale)
24. [Known Gaps and Future Work](#24-known-gaps-and-future-work)
25. [Governance](#25-governance)

---

## 1. Scope and Non-Goals

### In Scope

- The full runtime behavior of the Lex agent as deployed on the MISJustice Alliance Firm platform
- All tool bindings, interface contracts, and data schemas Lex operates against
- The analysis pipeline from task receipt to structured output delivery
- Memory architecture and MemoryPalace integration
- LLM routing, fallback behavior, and tracing
- Hard limit enforcement at the behavioral, policy, and runtime layers
- Initialization, session lifecycle, and degraded operation modes

### Non-Goals

- The internal implementation of other agents (Hermes, Rae, Iris, Avery, etc.) — see per-agent specs
- The content of specific legal matters, case files, or personal identifiers — never in this repository
- crewAI crew composition internals — see `workflows/openclaw/`
- OpenClaw / NemoClaw internal architecture — see `services/openclaw/`
- Paperclip control plane internals — see `services/paperclip/`
- MemoryPalace internals — see `services/memorypalace/`
- n8n workflow definitions — see `workflows/n8n/`

---

## 2. Design Principles

Lex is designed around five non-negotiable principles:

| Principle | Statement |
|---|---|
| **Evidence over assertion** | Every finding must be backed by cited data. Lex never states conclusions without supporting evidence. |
| **No legal advice** | Lex presents evidence and implications, never recommendations or predictions. |
| **Privacy by default** | All case-related data is sensitive. Tier-0 material never enters the agent pipeline. Lex enforces classification ceilings at both the behavioral and tooling layers. |
| **Transparency** | Lex surfaces uncertainty explicitly, flags data gaps, and never fills gaps with assumptions. |
| **Accuracy over speed** | This platform handles civil rights legal matters. Errors have real consequences. Lex never sacrifices accuracy for throughput. |

---

## 3. Architectural Position

Lex occupies **Layer 4 — Agent Runtime** of the MISJustice Alliance Firm platform stack. It is a specialist agent within the LegalResearchCrew and StrategyCrew.

```

┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 1 — HUMAN INTERFACE                   │
│  Hermes CLI/TUI · Hermes API · Open Web UI · Telegram · Discord │
└───────────────────────────┬─────────────────────────────────────┘
│ OpenClaw task payloads
↓
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 2 — CONTROL PLANE                       │
│                        Paperclip                                │
└───────────────────────────┬─────────────────────────────────────┘
│
↓
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 3 — ORCHESTRATION                       │
│           OpenClaw / NemoClaw  ←→  crewAI AMP Suite             │
└───────────────────────────┬─────────────────────────────────────┘
│
↓
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 4 — AGENT RUNTIME                       │
│       LangChain Agents · OpenShell Sandboxes · MemoryPalace     │
│       Lex lives here as a crewAI crew member                    │
└───────────────────────────┬─────────────────────────────────────┘
│
↓
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 5 — RESEARCH & RETRIEVAL                    │
│   MCP (cases_get, citations_resolve) · OpenRAG · LawGlance      │
│                   MCAS · LiteLLM                                │
└───────────────────────────┬─────────────────────────────────────┘
│
↓
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 6 — PERSISTENCE                         │
│    MCAS · OpenRAG/OpenSearch · MemoryPalace · Proton (Tier-0)   │
└─────────────────────────────────────────────────────────────────┘

```

**Key constraint:** Lex communicates downward through its tool set only. It has no direct service-to-service access to MCAS, OpenRAG, or any other Layer 5–6 service outside of its explicitly bound tools.

---

## 4. Component Dependencies

| Component | Role | Required | Failure Behavior |
|---|---|---|---|
| **OpenClaw** | Task dispatch and status tracking | ✅ Hard | Lex aborts startup — cannot function without task queue |
| **Paperclip** | Agent health and policy enforcement | ⚠️ Soft | Warn and continue — Paperclip may start after Lex |
| **MemoryPalace** | Cross-session memory via MCP | ⚠️ Soft | Warn and continue in degraded stateless mode |
| **LiteLLM** | Primary LLM proxy | ⚠️ Soft | Warn and fall back to Ollama |
| **Ollama** | Local LLM fallback | ⚠️ Soft | Warn — Lex requires at least one LLM to be reachable |
| **MCAS** | Matter and document read access | ✅ Hard | Lex aborts — cannot perform analysis without case data |
| **MCP** | Case retrieval and citation resolution | ✅ Hard | Lex aborts — cannot perform legal research without MCP |

---

## 5. Agent Construction

### Framework

Lex is built using **LangChain** as the agent construction framework with **LangSmith Agent Builder** as the development, evaluation, and tracing environment.

- **Agent type:** `tool_calling` — Lex uses `create_tool_calling_agent` with a structured tool set
- **Base class:** `MISJusticeBaseAgent` at `agents/base/agent.py`
- **LLM abstraction:** All LLM calls route through `ChatLiteLLM` wrapper

```python
# Simplified construction — see agents/base/agent.py for full implementation
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_litellm import ChatLiteLLM
from agents.base.agent import MISJusticeBaseAgent

lex = MISJusticeBaseAgent(
    role="lex",
    tools=lex_tools,                          # 5 tools — see Section 8
    system_prompt_path="agents/lex/system_prompt.md",
    llm_model="claude-3-5-sonnet",
    memory_scope="session",
    search_token_tier="tier2",
)
```

### LangSmith Tracing

All LLM calls, tool invocations, and retrieval calls are traced to LangSmith project `misjustice-alliance-firm`.

```yaml
langsmith:
  project: misjustice-alliance-firm
  tracing: true
  trace_all_tool_calls: true
  trace_all_llm_calls: true
  endpoint: https://api.smith.langchain.com
  api_key_env: LANGCHAIN_API_KEY
```

---

## 6. Identity Layer — SOUL.md

Lex loads [`SOUL.md`](./SOUL.md) at initialization as its **persistent identity constitution**.

### Load Order

```
1. SOUL.md          → persistent identity (who Lex is, core values, hard limits)
2. system_prompt.md → operational instructions (how Lex behaves in this deployment)
3. MemoryPalace     → cross-session context (prior analysis patterns, preferences)
```

### SOUL.md Integrity Verification

At startup, Lex verifies:

1. `SOUL.md` is present at `agents/lex/SOUL.md` — **abort on failure**
2. SOUL.md version matches `agent.yaml:identity.soul_md_version` — **abort on mismatch**

A tampered, missing, or version-mismatched SOUL.md is treated as a critical startup failure.

---

## 7. System Prompt Contract

[`system_prompt.md`](./system_prompt.md) is the runtime behavioral instruction set for every Lex session.

| Section | Content |
| :-- | :-- |
| **Who You Are** | Runtime identity declaration — Senior Analyst, not an attorney |
| **Primary Function** | Synthesize legal research into strategic insights; no legal advice |
| **Hard Rules** | 6 absolute constraints: no legal advice, no prediction, no unverified facts, data classification, source credit, no sensitive reproduction |
| **Operating Style** | Formal, precise, objective language; clear section headings |
| **Workflow** | 4-step analysis workflow: confirm scope, gather data, analyze, output |
| **Escalation Rules** | 5 escalation triggers with required output format |
| **Templates** | Systemic pattern report and jurisdictional trend report templates |

---

## 8. Tool Interface Contracts

### 8.1 MatterReadTool

```python
class MatterReadToolInput(BaseModel):
    matter_id: str               # MCAS matter ID
    fields: list[str]            # Optional field filter

# Returns:
# { matter_id, title, phase, category, jurisdiction, key_dates, open_tasks_count }
```

**Classification ceiling:** Tier-2. Tier-0 and Tier-1 fields are redacted by MCAS before return.

### 8.2 DocumentReadTool

```python
class DocumentReadToolInput(BaseModel):
    document_id: str             # MCAS document ID
    matter_id: str               # Associated matter ID

# Returns:
# { document_id, matter_id, title, content, metadata, classification }
```

**Classification ceiling:** Tier-2. Tier-0 and Tier-1 documents require explicit approval.

### 8.3 AuditLogWriteTool

```python
class AuditLogWriteToolInput(BaseModel):
    event_type: str              # e.g., "analysis_started", "output_delivered"
    task_id: str
    matter_id: Optional[str]
    details: dict                # Structured event details

# Returns:
# { event_id, logged_at, status }
```

### 8.4 MCP cases_get

```python
class MCPCasesGetInput(BaseModel):
    query: str                   # Case search query
    jurisdiction: Optional[str]
    date_range: Optional[tuple]
    max_results: int             # Default: 50

# Returns:
# { cases: [ { citation, title, date, jurisdiction, summary } ] }
```

### 8.5 MCP citations_resolve

```python
class MCPCitationsResolveInput(BaseModel):
    citations: list[str]         # List of citation strings to resolve

# Returns:
# { resolved: [ { citation, valid, canonical_form, source_url } ] }
```

---

## 9. Analysis Pipeline

The complete flow from task receipt to output delivery:

```
OpenClaw task payload received
        │
        ▼
┌──────────────────────────────────┐
│  Step 1: Confirm Scope           │
│  Validate required fields        │
│  Request missing information     │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│  Step 2: Data Gathering          │
│  Query MCAS, MCP, Neo4j GraphRAG │
│  Retrieve cases, documents,      │
│  precedents, statutory refs      │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│  Step 3: Analysis                │
│  Identify patterns, map trends,  │
│  forecast risks, flag gaps       │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│  Step 4: Output Generation       │
│  Format report with sections,    │
│  citations, classification,      │
│  disclaimer, escalation rec      │
└──────────────────┬───────────────┘
                   │
                   ▼
        Structured output → OpenClaw
```

---

## 10. Memory Architecture

Lex uses **MemoryPalace** (MCP-integrated) for session-scoped context.

### Memory Scope Model

| Property | Value |
|---|---|
| **Provider** | MemoryPalace MCP |
| **Scope** | Session only |
| **Classification ceiling** | Tier-2 |
| **Session retention** | Discarded on session end |

Lex does not persist analysis outputs to memory. All outputs are delivered via OpenClaw and stored in MCAS.

---

## 11. LLM Routing and Fallback

All LLM calls route through **LiteLLM** proxy.

### Routing Chain

```
Request → LiteLLM proxy ($LITELLM_BASE_URL)
              │
              ├─ Primary:  claude-3-5-sonnet
              ├─ Fallback: gpt-4o
              └─ Local:    Ollama / llama3
                           [activated when external providers unreachable]
```

### Configuration

| Parameter | Value | Rationale |
| :-- | :-- | :-- |
| Temperature | `0.2` | Low — precision and consistency |
| Max tokens | `8192` | Sufficient for lengthy legal analysis outputs |
| Streaming | `true` | Responses streamed for responsiveness |

---

## 12. Sandbox Runtime

Each Lex task runs in a **fresh OpenShell sandbox** provisioned by NemoClaw.

| Parameter | Value |
|---|---|
| Provider | OpenShell (NVIDIA) |
| Base image | `openclaw` |
| Policy file | `services/openshell/policies/lex_policy.yaml` |
| Sandbox per task | Yes |
| TTL | 300 seconds |

---

## 13. Observability and Audit

### Audit Stream

All Lex activity is emitted to the **OpenClaw audit stream**, feeding into **Veritas**.

**Audited events:**

| Category | Events |
| :-- | :-- |
| Task | `task_received` · `analysis_started` · `analysis_completed` · `output_delivered` |
| Data | `data_source_queried` · `citation_validated` · `classification_checked` |
| Policy | `policy_conflict_surfaced` · `hard_limit_invoked` · `escalation_triggered` |

---

## 14. Hard Limit Enforcement Model

Each hard limit is enforced at multiple independent layers:

| Hard Limit | Behavioral Layer | Policy Layer | Runtime Layer |
| :-- | :-- | :-- | :-- |
| No legal advice | SOUL.md · system prompt | — | LangSmith output evaluation |
| No outcome prediction | SOUL.md · system prompt | — | LangSmith output evaluation |
| No unverified facts | SOUL.md · system prompt | — | LangSmith output evaluation |
| Data classification | SOUL.md · system prompt | Paperclip policy | MCAS classification enforcement |
| No sensitive reproduction | SOUL.md · system prompt | Paperclip deny rules | Output parser |

---

## 15. Data Classification Compliance

Lex enforces Tier-2 ceilings across all data interactions.

| Tier | Label | Lex Access |
| :-- | :-- | :-- |
| Tier-0 | EYES-ONLY | **Never** |
| Tier-1 | RESTRICTED | **Read-only with approval gate** |
| Tier-2 | INTERNAL | **Read/write** |
| Tier-3 | PUBLIC-SAFE | Read-only for context |

---

## 16. Health Check Specification

### Startup Checks

| Check | Target | Method | On Failure |
| :-- | :-- | :-- | :-- |
| `soul_md_present` | `agents/lex/SOUL.md` | File read | **Abort** |
| `soul_md_version_match` | `agent.yaml:identity.soul_md_version` | String compare | **Abort** |
| `openclaw_reachable` | `$OPENCLAW_API_URL` | HTTP GET `/health` | **Abort** |
| `paperclip_reachable` | `$PAPERCLIP_API_URL` | HTTP GET `/health` | **Warn** |
| `memorypalace_reachable` | `$MEMORYPALACE_MCP_URL` | MCP ping | **Warn** |
| `litellm_reachable` | `$LITELLM_BASE_URL` | HTTP GET `/health` | **Warn** |
| `mcas_reachable` | `$MCAS_API_URL` | HTTP GET `/health` | **Abort** |
| `mcp_reachable` | `$MCP_API_URL` | HTTP GET `/health` | **Abort** |

---

## 17. Initialization Sequence

```
1. Load SOUL.md from agents/lex/SOUL.md
   → Verify version matches agent.yaml
   → Abort on any mismatch

2. Load system_prompt.md from agents/lex/system_prompt.md
   → Construct ChatPromptTemplate

3. Initialize LiteLLM-backed LLM (claude-3-5-sonnet primary)
   → Fall back to gpt-4o if LiteLLM primary unreachable

4. Bind tool set (5 tools from agents/base/tools/)
   → Confirm all tool class imports resolve
   → Apply Paperclip policy (lex_policy.paperclip.yaml)

5. Run startup health checks (see Section 16)
   → Abort on hard failures
   → Continue with warnings on soft failures

6. Initialize MemoryPalace MCP connection
   → Load session context if available

7. Signal ready to OpenClaw
   → Await task dispatch
```

---

## 18. Session Lifecycle

A Lex session begins when OpenClaw dispatches a task and ends when the output is delivered.

| Phase | Actions |
|---|---|
| **Start** | Load SOUL.md, system prompt, memory context |
| **Scope Confirmation** | Validate task payload, request missing fields |
| **Data Gathering** | Invoke tools to retrieve case data, precedents |
| **Analysis** | LLM reasoning over gathered data |
| **Output Generation** | Format structured report with citations |
| **Delivery** | Return output to OpenClaw, write audit log |
| **End** | Clear session memory, emit session_end event |

---

## 19. Failure Modes and Degraded Operation

| Failure | Behavior |
|---|---|
| Primary LLM unreachable | Fall back to gpt-4o; notify operator |
| All external LLMs unreachable | Fall back to Ollama; degraded quality warning |
| MemoryPalace unreachable | Stateless mode; continue with warning |
| MCAS unreachable | Halt task; notify operator |
| MCP unreachable | Halt task; notify operator |
| Incomplete data | Escalate to human; do not proceed with assumptions |

---

## 20. Security Considerations

- Lex has no network egress outside whitelisted internal services
- All tool calls are logged to the audit stream
- Lex cannot write to MCAS matter or person core fields
- Tier-0 data is blocked at the MCAS API layer before reaching Lex
- All outputs pass through classification and PII guardrails before delivery

---

## 21. Configuration Reference

See [`config.yaml`](./config.yaml) for the complete runtime configuration.

Key values:

| Parameter | Value | File |
|---|---|---|
| Primary model | claude-3-5-sonnet | `models.yaml` |
| Temperature | 0.2 | `models.yaml` |
| Max tokens | 8192 | `models.yaml` |
| Data tier | T1-T2 | `POLICY.md` |
| Max iterations | 10 | `config.yaml` |
| Sandbox TTL | 300s | `config.yaml` |

---

## 22. File Reference

```
agents/lex/
├── README.md
├── SOUL.md
├── agent.yaml
├── system_prompt.md
├── SPEC.md              ← This file
├── MEMORY.md
├── tools.yaml
├── models.yaml
├── config.yaml
├── POLICY.md
├── GUARDRAILS.yaml
├── EVALS.yaml
├── RUNBOOK.md
├── METRICS.md
├── memory/
├── evals/
└── logs/
```

---

## 23. Design Decisions and Rationale

### Why claude-3-5-sonnet as primary?

Claude 3.5 Sonnet was selected for its strong performance on legal reasoning, long-context handling, and structured output reliability — critical for producing formal legal analysis reports.

### Why max_tokens 8192?

Legal analysis outputs often include lengthy findings sections with multiple citations, data source lists, and implication discussions. 8192 tokens provides sufficient headroom for comprehensive reports.

### Why temperature 0.2?

Low temperature ensures consistent, precise analysis language and reduces hallucination risk when synthesizing across multiple cases.

---

## 24. Known Gaps and Future Work

- **GraphRAG integration**: Neo4j graph queries for precedent relationships are referenced in system_prompt.md but not yet bound as a formal tool.
- **Multi-jurisdiction parallel search**: Currently sequential; future work to parallelize MCP queries across jurisdictions.
- **Citation confidence scoring**: Automated confidence scores for cited precedents (binding vs. persuasive).

---

## 25. Governance

| Field | Value |
|---|---|
| **Agent version** | `0.2.0` |
| **SOUL.md version** | `0.1.0` |
| **Effective date** | 2026-04-16 |
| **Review cycle** | Every 90 days |
| **Change process** | PR review + HOB approval + SOUL.md sync + reinitialization |
| **Supersedes** | N/A |

---

*Lex — MISJustice Alliance Firm · Lead Counsel / Senior Analyst*
*Not an attorney. Not autonomous. Not a replacement for human judgment.*
