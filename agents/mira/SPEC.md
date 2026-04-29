# Mira Agent — Engineering Specification

> **MISJustice Alliance Firm · `agents/mira/SPEC.md`**
> Agent version: `0.2.0` · Effective: 2026-04-16 · Status: **Active**

This document is the authoritative engineering specification for the Mira agent. It covers design decisions, component contracts, interface schemas, data flows, behavioral rules, and integration boundaries.

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
9. [Research Pipeline](#9-research-pipeline)
10. [Messaging Pipeline](#10-messaging-pipeline)
11. [Memory Architecture](#11-memory-architecture)
12. [LLM Routing and Fallback](#12-llm-routing-and-fallback)
13. [Sandbox Runtime](#13-sandbox-runtime)
14. [Observability and Audit](#14-observability-and-audit)
15. [Hard Limit Enforcement Model](#15-hard-limit-enforcement-model)
16. [Data Classification Compliance](#16-data-classification-compliance)
17. [Health Check Specification](#17-health-check-specification)
18. [Initialization Sequence](#18-initialization-sequence)
19. [Session Lifecycle](#19-session-lifecycle)
20. [Failure Modes](#20-failure-modes)
21. [Security Considerations](#21-security-considerations)
22. [Configuration Reference](#22-configuration-reference)
23. [File Reference](#23-file-reference)
24. [Governance](#24-governance)

---

## 1. Scope and Non-Goals

### In Scope

- Full runtime behavior of the Mira agent as deployed on the MISJustice Alliance Firm platform
- All tool bindings, interface contracts, and data schemas Mira operates against
- Research pipeline: case retrieval, statute search, citation resolution
- Messaging pipeline: message drafting, risk screening, consent verification
- Memory architecture and MemoryPalace integration
- LLM routing, fallback behavior, and tracing
- Hard limit enforcement at behavioral, policy, and runtime layers
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

Mira is designed around five non-negotiable principles:

| Principle | Statement |
|---|---|
| **Consent is mandatory** | No outreach without documented consent or staff-approved lawful basis |
| **Privacy minimization** | Collect and transmit the minimum data necessary |
| **No legal advice** | Mira provides procedural information only, never strategy or advice |
| **No impersonation** | Mira never claims to be a human, attorney, or official |
| **Accuracy over speed** | Legal research and communications must be precise and compliant |

---

## 3. Architectural Position

Mira occupies **Layer 4 — Agent Runtime** of the MISJustice Alliance Firm platform stack. It is a specialist agent within the LegalResearchCrew and CommunicationsCrew.

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
│       Mira lives here as a crewAI crew member                   │
└───────────────────────────┬─────────────────────────────────────┘
│
↓
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 5 — RESEARCH & RETRIEVAL                    │
│   MCP (cases_get, statutes_search, citations_resolve)           │
│   SearXNG · OpenRAG · LawGlance · MCAS · LiteLLM              │
└───────────────────────────┬─────────────────────────────────────┘
│
↓
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 6 — PERSISTENCE                         │
│    MCAS · OpenRAG/OpenSearch · MemoryPalace · Proton (Tier-0)   │
└─────────────────────────────────────────────────────────────────┘

```

**Key constraint:** Mira communicates downward through its tool set only. It has no direct service-to-service access to MCAS, OpenRAG, SearXNG, or any other Layer 5–6 service outside of its explicitly bound tools.

---

## 4. Component Dependencies

| Component | Role | Required | Failure Behavior |
|---|---|---|---|
| **OpenClaw** | Task dispatch and status tracking | ✅ Hard | Mira aborts startup — cannot function without task queue |
| **Paperclip** | Agent health and policy enforcement | ⚠️ Soft | Warn and continue — Paperclip may start after Mira |
| **MemoryPalace** | Cross-session memory via MCP | ⚠️ Soft | Warn and continue in degraded stateless mode |
| **LiteLLM** | Primary LLM proxy | ⚠️ Soft | Warn and fall back to Ollama |
| **Ollama** | Local LLM fallback | ⚠️ Soft | Warn — Mira requires at least one LLM to be reachable |
| **MCAS** | Matter and document read access | ✅ Hard | Mira aborts — cannot perform research without case data |
| **MCP** | Case retrieval, statute search, citation resolution | ✅ Hard | Mira aborts — cannot perform legal research without MCP |
| **SearXNG** | Web search for research | ⚠️ Soft | Degraded research mode (MCP only) |

---

## 5. Agent Construction

### Framework

Mira is built using **LangChain** as the agent construction framework with **LangSmith Agent Builder** as the development, evaluation, and tracing environment.

- **Agent type:** `tool_calling` — Mira uses `create_tool_calling_agent` with a structured tool set
- **Base class:** `MISJusticeBaseAgent` at `agents/base/agent.py`
- **LLM abstraction:** All LLM calls route through `ChatLiteLLM` wrapper

```python
# Simplified construction — see agents/base/agent.py for full implementation
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_litellm import ChatLiteLLM
from agents.base.agent import MISJusticeBaseAgent

mira = MISJusticeBaseAgent(
    role="mira",
    tools=mira_tools,                          # 6 tools — see Section 8
    system_prompt_path="agents/mira/system_prompt.md",
    llm_model="claude-3-5-sonnet",
    memory_scope="session+cross-session",
    search_token_tier="tier3",
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

Mira loads [`SOUL.md`](./SOUL.md) at initialization as its **persistent identity constitution**.

### Load Order

```
1. SOUL.md          → persistent identity (who Mira is, core values, hard limits)
2. system_prompt.md → operational instructions (how Mira behaves in this deployment)
3. MemoryPalace     → cross-session context (consent preferences, opt-out records)
```

### SOUL.md Integrity Verification

At startup, Mira verifies:

1. `SOUL.md` is present at `agents/mira/SOUL.md` — **abort on failure**
2. SOUL.md version matches `agent.yaml:identity.soul_md_version` — **abort on mismatch**

A tampered, missing, or version-mismatched SOUL.md is treated as a critical startup failure.

---

## 7. System Prompt Contract

[`system_prompt.md`](./system_prompt.md) is the runtime behavioral instruction set for every Mira session.

| Section | Content |
| :-- | :-- |
| **Who You Are** | Runtime identity declaration — telephony & messaging specialist, not an attorney |
| **Primary Function** | Legal research and compliant communication drafting |
| **Hard Rules** | 6 absolute constraints: no legal advice, no impersonation, consent required, no harassment, data classification, recording safety |
| **Operating Style** | Brief, clear, friendly; 6th–8th grade reading level |
| **Workflow: Outbound Message** | 3-step sequence: confirm prerequisites, risk screen, output format |
| **Workflow: Inbound Reply** | 5-step intent classification and response |
| **Escalation Rules** | 7 escalation triggers with required output format |
| **Templates** | SMS scheduling, document request, wrong number, opt-out, de-escalation, restricted data escalation |

---

## 8. Tool Interface Contracts

All Mira tools are LangChain `BaseTool` subclasses defined in `agents/base/tools/`. Tool access is enforced at two layers: the `agent.yaml` tool list (availability) and `mira_policy.paperclip.yaml` (runtime allow/deny).

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

### 8.3 MCP cases_get

```python
class MCPCasesGetInput(BaseModel):
    query: str                   # Case search query
    jurisdiction: Optional[str]
    date_range: Optional[tuple]
    max_results: int             # Default: 50

# Returns:
# { cases: [ { citation, title, date, jurisdiction, summary } ] }
```

### 8.4 MCP statutes_search

```python
class MCPStatutesSearchInput(BaseModel):
    query: str                   # Statute search query
    jurisdiction: Optional[str]
    code_type: Optional[str]     # e.g., "USC", "state", "local"
    max_results: int             # Default: 50

# Returns:
# { statutes: [ { citation, title, text, jurisdiction, effective_date } ] }
```

### 8.5 MCP citations_resolve

```python
class MCPCitationsResolveInput(BaseModel):
    citations: list[str]         # List of citation strings to resolve

# Returns:
# { resolved: [ { citation, valid, canonical_form, source_url } ] }
```

### 8.6 SearXNGWrapper

```python
class SearXNGWrapperInput(BaseModel):
    query: str
    search_type: str = "general"    # general | news | legal
    max_results: int = 20
    safe_search: int = 2            # 0=off, 1=moderate, 2=strict

# Returns:
# { results: [ { title, url, snippet, source } ] }
```

**Classification ceiling:** Tier-3. SearXNG results are public-web content only.

---

## 9. Research Pipeline

The complete flow from task receipt to research output delivery:

```
OpenClaw task payload received
        │
        ▼
┌──────────────────────────────────┐
│  Step 1: Confirm Scope           │
│  Validate task type and params   │
│  Request missing information     │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│  Step 2: Data Retrieval          │
│  Query MCP (cases/statutes/cite) │
│  Query SearXNG if needed         │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│  Step 3: Synthesis               │
│  LLM reasoning over results      │
│  Validate citations              │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│  Step 4: Output Delivery         │
│  Structured research output      │
│  With disclaimer and citations   │
└──────────────────┬───────────────┘
                   │
                   ▼
        Structured output → OpenClaw
```

---

## 10. Messaging Pipeline

The complete flow for message drafting tasks:

```
OpenClaw task payload received
        │
        ▼
┌──────────────────────────────────┐
│  Step 1: Confirm Prerequisites   │
│  Purpose, channel, consent,      │
│  urgency, classification         │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│  Step 2: Risk Screen             │
│  Check for legal advice,         │
│  restricted data, sensitive      │
│  details, opt-out requirement    │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│  Step 3: Output Format           │
│  Recommended message text        │
│  Channel notes, consent notes    │
│  Classification tag, escalation  │
└──────────────────┬───────────────┘
                   │
                   ▼
        Draft → OpenClaw (awaiting HITL before send)
```

**Important:** Mira drafts messages only. It does **not** autonomously send messages unless explicitly enabled and instructed by the orchestration layer.

---

## 11. Memory Architecture

Mira uses **MemoryPalace** (MCP-integrated, locally-run) for session-scoped context and cross-session consent/opt-out records.

### Memory Scope Model

| Property | Value |
|---|---|
| **Provider** | MemoryPalace MCP |
| **MCP URL** | `$MEMORYPALACE_MCP_URL` (injected at runtime) |
| **Agent scope** | `mira` |
| **Classification ceiling** | `tier2` |
| **Session storage** | In-process LangChain `ConversationBufferWindowMemory` (k=20 turns) |
| **Cross-session storage** | MemoryPalace vector + key-value store |
| **Unavailability fallback** | Stateless mode |

### Permitted Memory Categories

Mira is authorized to write to exactly **four** memory categories:

| Category | Scope | Description |
|---|---|---|
| `analysis_context` | Session | Working context for research tasks |
| `consent_registry` | Cross-session | Documented consent statuses per contact |
| `opt_out_registry` | Cross-session | Do-not-contact records |
| `operator_preferences` | Cross-session | Communication style preferences |

---

## 12. LLM Routing and Fallback

All LLM calls route through **LiteLLM** proxy.

### Routing Chain

```
Request → LiteLLM proxy ($LITELLM_BASE_URL)
              │
              ├─ Primary:  claude-3-5-sonnet
              ├─ Fallback: gpt-4o
              └─ Local:    Ollama / llama3 ($OLLAMA_BASE_URL)
                           [activated when external providers unreachable]
```

### Configuration

| Parameter | Value | Rationale |
| :-- | :-- | :-- |
| Temperature | `0.1` | Very low — maximizes consistency for research and messaging |
| Max tokens | `4096` | Sufficient for research summaries and message drafts |
| Streaming | `true` | Responses streamed for responsiveness |
| Local fallback trigger | `external_unavailable` | Auto-activates when LiteLLM cannot reach external providers |

---

## 13. Sandbox Runtime

Each Mira task runs in a **fresh OpenShell sandbox** provisioned by NemoClaw.

| Parameter | Value |
|---|---|
| Provider | OpenShell (NVIDIA) |
| Base image | `openclaw` |
| Policy file | `services/openshell/policies/mira_policy.yaml` |
| Sandbox per task | Yes |
| TTL | 300 seconds |

---

## 14. Observability and Audit

### Audit Stream

All Mira activity is emitted to the **OpenClaw audit stream**, which feeds into **Veritas**.

**Audited events:**

| Category | Events |
| :-- | :-- |
| Task | `task_received` · `research_started` · `message_drafted` |
| Data | `cases_retrieved` · `statutes_searched` · `citations_resolved` · `searxng_queried` |
| Policy | `policy_conflict_surfaced` · `hard_limit_invoked` · `escalation_triggered` |
| Comms | `consent_checked` · `opt_out_recorded` · `message_risk_screened` |

---

## 15. Hard Limit Enforcement Model

Each of Mira's hard limits is enforced at multiple independent layers:

| Hard Limit | Behavioral Layer | Policy Layer | Runtime Layer |
| :-- | :-- | :-- | :-- |
| No legal advice | SOUL.md · system prompt | — | LangSmith output evaluation |
| No impersonation | SOUL.md · system prompt | — | Output parser |
| No contact without consent | SOUL.md · system prompt | Paperclip deny rules | Messaging gateway disabled |
| No harassment | SOUL.md · system prompt | — | Output parser |
| Data classification | SOUL.md · system prompt | Paperclip policy | MCAS enforcement |
| No recording without consent | SOUL.md · system prompt | — | System prompt |

---

## 16. Data Classification Compliance

The platform uses a four-tier classification model. Mira enforces Tier-3 ceilings for search and Tier-2 for memory.

| Tier | Label | Mira Access |
| :-- | :-- | :-- |
| Tier-0 | EYES-ONLY | **Never** |
| Tier-1 | RESTRICTED | **Read-only with approval gate** for legal research; never in SMS |
| Tier-2 | INTERNAL | **Read/write** for research and messaging context |
| Tier-3 | PUBLIC-SAFE | **Read/write** for outbound communications and published research |

---

## 17. Health Check Specification

### Startup Checks

Run sequentially at initialization. Abort checks halt the entire startup process.

| Check | Target | Method | On Failure |
| :-- | :-- | :-- | :-- |
| `soul_md_present` | `agents/mira/SOUL.md` | File read | **Abort** |
| `soul_md_version_match` | `agent.yaml:identity.soul_md_version` | String compare | **Abort** |
| `openclaw_reachable` | `$OPENCLAW_API_URL` | HTTP GET `/health` | **Abort** |
| `paperclip_reachable` | `$PAPERCLIP_API_URL` | HTTP GET `/health` | **Warn** |
| `memorypalace_reachable` | `$MEMORYPALACE_MCP_URL` | MCP ping | **Warn** |
| `litellm_reachable` | `$LITELLM_BASE_URL` | HTTP GET `/health` | **Warn** |
| `mcas_reachable` | `$MCAS_API_URL` | HTTP GET `/health` | **Abort** |
| `mcp_reachable` | `$MCP_API_URL` | HTTP GET `/health` | **Abort** |
| `searxng_reachable` | `$SEARXNG_API_URL` | HTTP GET `/health` | **Warn** |

---

## 18. Initialization Sequence

```
1. Load SOUL.md from agents/mira/SOUL.md
   → Verify version matches agent.yaml
   → Abort on any mismatch

2. Load system_prompt.md from agents/mira/system_prompt.md
   → Construct ChatPromptTemplate

3. Initialize LiteLLM-backed LLM (claude-3-5-sonnet primary)
   → Fall back to gpt-4o if LiteLLM primary unreachable

4. Bind tool set (6 tools from agents/base/tools/)
   → Confirm all tool class imports resolve
   → Apply Paperclip policy (mira_policy.paperclip.yaml)

5. Run startup health checks (see Section 17)
   → Abort on hard failures
   → Continue with warnings on soft failures

6. Initialize MemoryPalace MCP connection
   → Load consent registry, opt-out registry, operator preferences

7. Signal ready to OpenClaw
   → Await task dispatch
```

---

## 19. Session Lifecycle

A Mira session begins when OpenClaw dispatches a task and ends when the output is delivered.

| Phase | Actions |
|---|---|
| **Start** | Load SOUL.md, system prompt, memory context |
| **Prerequisites** | Confirm scope, consent, classification |
| **Execution** | Invoke tools, perform research or drafting |
| **Risk Screen** | Check for policy violations in output |
| **Delivery** | Return output to OpenClaw, write audit log |
| **End** | Clear session memory, update consent registry if needed |

---

## 20. Failure Modes

| Failure | Behavior |
|---|---|
| Primary LLM unreachable | Fall back to gpt-4o; notify operator |
| All external LLMs unreachable | Fall back to Ollama; degraded quality warning |
| MemoryPalace unreachable | Stateless mode; consent checks via MCAS fallback |
| MCAS unreachable | Halt task; notify operator |
| MCP unreachable | Halt task; notify operator |
| SearXNG unreachable | Degraded research mode (MCP only) |
| Missing consent | Escalate to human; do not draft message |
| Opt-out received | Confirm opt-out; mark do-not-contact |

---

## 21. Security Considerations

- Mira has no network egress outside whitelisted internal services
- Messaging gateways are disabled by default
- All message drafts pass through risk screening before delivery
- Tier-0 data is blocked at the MCAS API layer before reaching Mira
- Consent and opt-out records are immutable after write

---

## 22. Configuration Reference

See [`config.yaml`](./config.yaml) for the complete runtime configuration.

Key values:

| Parameter | Value | File |
|---|---|---|
| Primary model | claude-3-5-sonnet | `models.yaml` |
| Temperature | 0.1 | `models.yaml` |
| Max tokens | 4096 | `models.yaml` |
| Data tier | T1-T3 | `POLICY.md` |
| Max iterations | 10 | `config.yaml` |
| Sandbox TTL | 300s | `config.yaml` |
| Messaging gateway | disabled | `config.yaml` |
| Telephony gateway | disabled | `config.yaml` |

---

## 23. File Reference

```
agents/mira/
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

## 24. Governance

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
