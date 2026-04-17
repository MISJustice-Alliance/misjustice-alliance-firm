# Hermes Agent — Engineering Specification

> **MISJustice Alliance Firm · `agents/hermes/SPEC.md`**
> Agent version: `1.0.0` · Effective: 2026-04-10 · Status: **Active**

This document is the authoritative engineering specification for the Hermes agent. It covers design decisions, component contracts, interface schemas, data flows, behavioral rules, and integration boundaries. It is written for platform engineers, agent developers, and systems integrators.

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
9. [Task Delegation Pipeline](#9-task-delegation-pipeline)
10. [HITL Gate Architecture](#10-hitl-gate-architecture)
11. [Skill Factory Subsystem](#11-skill-factory-subsystem)
12. [Subagent Spawn Architecture](#12-subagent-spawn-architecture)
13. [Memory Architecture](#13-memory-architecture)
14. [LLM Routing and Fallback](#14-llm-routing-and-fallback)
15. [Sandbox Runtime](#15-sandbox-runtime)
16. [Notification and Messaging Architecture](#16-notification-and-messaging-architecture)
17. [Observability and Audit](#17-observability-and-audit)
18. [Hard Limit Enforcement Model](#18-hard-limit-enforcement-model)
19. [Data Classification Compliance](#19-data-classification-compliance)
20. [Health Check Specification](#20-health-check-specification)
21. [Initialization Sequence](#21-initialization-sequence)
22. [Session Lifecycle](#22-session-lifecycle)
23. [Failure Modes and Degraded Operation](#23-failure-modes-and-degraded-operation)
24. [Security Considerations](#24-security-considerations)
25. [Configuration Reference](#25-configuration-reference)
26. [File Reference](#26-file-reference)
27. [Design Decisions and Rationale](#27-design-decisions-and-rationale)
28. [Known Gaps and Future Work](#28-known-gaps-and-future-work)
29. [Governance](#29-governance)

---

## 1. Scope and Non-Goals

### In Scope

This specification covers:

- The full runtime behavior of the Hermes agent as deployed on the MISJustice Alliance Firm platform
- All tool bindings, interface contracts, and data schemas Hermes operates against
- The task delegation pipeline from operator instruction to OpenClaw dispatch
- The HITL gate system as surfaced and managed by Hermes
- The Skill Factory subsystem and its two-gate activation model
- The transient subagent spawn system via NemoClaw / OpenShell
- Memory architecture and MemoryPalace integration
- LLM routing, fallback behavior, and tracing
- Hard limit enforcement at the behavioral, policy, and runtime layers
- Initialization, session lifecycle, and degraded operation modes

### Non-Goals

This specification does not cover:

- The internal implementation of downstream agents (Rae, Lex, Iris, Avery, etc.) — see per-agent specs
- The content of specific legal matters, case files, or personal identifiers — never in this repository
- crewAI crew composition internals — see `workflows/openclaw/`
- OpenClaw / NemoClaw internal architecture — see `services/openclaw/`
- Paperclip control plane internals — see `services/paperclip/`
- MemoryPalace internals — see `services/memorypalace/`
- n8n workflow definitions — see `workflows/n8n/`

---

## 2. Design Principles

Hermes is designed around five non-negotiable principles. Every architectural decision in this spec traces back to at least one of them.

| Principle | Statement |
|---|---|
| **Human authority is supreme** | Hermes never makes decisions that belong to human operators. Every critical action — task dispatch, HITL resolution, publication, external transmission — requires explicit human authorization. |
| **Scope discipline** | Hermes is an interface and control agent only. It does not conduct research, produce legal analysis, or publish content. Scope drift is an active failure mode that must be resisted by design. |
| **Accuracy over speed** | This platform handles civil rights legal matters. Errors have real consequences for real people. Hermes never sacrifices accuracy for throughput. Uncertainty is surfaced, not suppressed. |
| **Privacy by default** | All case-related data is sensitive. Tier-0 material never enters the agent pipeline. Hermes enforces classification ceilings at both the behavioral and tooling layers. |
| **Radical transparency** | Operators always know what Hermes is doing, why, and what the risks are. Hermes never complies silently with problematic instructions. |

---

## 3. Architectural Position

Hermes occupies **Layer 1 — Human Interface** of the MISJustice Alliance Firm platform stack. It is the sole entry point for operator interaction and the sole return path for agent outputs to human operators.

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
└───────────────────────────┬─────────────────────────────────────┘
│
↓
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 5 — RESEARCH \& RETRIEVAL                    │
│   AutoResearchClaw · researchclaw-skill · LiteLLM · SearXNG     │
│                   OpenRAG · LawGlance · MCAS                    │
└───────────────────────────┬─────────────────────────────────────┘
│
↓
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 6 — PERSISTENCE                         │
│    MCAS · OpenRAG/OpenSearch · MemoryPalace · Proton (Tier-0)   │
└─────────────────────────────────────────────────────────────────┘

```

**Key constraint:** Hermes communicates downward through its tool set only. It has no direct service-to-service access to MCAS, OpenRAG, SearXNG, or any other Layer 5–6 service outside of its explicitly bound tools.

**crewAI relationship:** Hermes is **not** a crewAI crew member. It dispatches to crewAI crews via OpenClaw but does not participate in crew execution. The Orchestrator agent fills the crewAI manager role within each crew.

---

## 4. Component Dependencies

| Component | Role | Required | Failure Behavior |
|---|---|---|---|
| **OpenClaw** | Task dispatch and status tracking | ✅ Hard | Hermes aborts startup — cannot function without task queue |
| **n8n** | HITL gate routing | ✅ Hard | Hermes aborts startup — HITL gates cannot be routed |
| **Paperclip** | Agent health and policy enforcement | ⚠️ Soft | Warn and continue — Paperclip may start after Hermes |
| **MemoryPalace** | Cross-session memory via MCP | ⚠️ Soft | Warn and continue in degraded stateless mode |
| **LiteLLM** | Primary LLM proxy | ⚠️ Soft | Warn and fall back to Ollama |
| **Ollama** | Local LLM fallback | ⚠️ Soft | Warn — Hermes requires at least one LLM to be reachable |
| **OpenShell / NemoClaw** | Sandbox provisioning per task | ⚠️ Soft | Warn — task dispatch may fail if sandbox cannot be provisioned |
| **LangSmith** | Tracing and evaluation | ⚠️ Soft | Warn — Hermes continues; audit stream and Veritas feed remain active |

---

## 5. Agent Construction

### Framework

Hermes is built using **LangChain** as the agent construction framework with **LangSmith Agent Builder** as the development, evaluation, and tracing environment.

- **Agent type:** `tool_calling` — Hermes uses `create_tool_calling_agent` with a structured tool set
- **Base class:** `MISJusticeBaseAgent` at `agents/base/agent.py` — handles LLM initialization, tool binding, memory MCP connection, OpenShell sandbox enforcement, and audit logging
- **LLM abstraction:** All LLM calls route through `ChatLiteLLM` wrapper, enabling model swapping and unified observability without agent code changes

```python
# Simplified construction — see agents/base/agent.py for full implementation
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_litellm import ChatLiteLLM
from agents.base.agent import MISJusticeBaseAgent

hermes = MISJusticeBaseAgent(
    role="hermes",
    tools=hermes_tools,                          # 17 tools — see Section 8
    system_prompt_path="agents/hermes/system_prompt.md",
    llm_model="gpt-4o",
    memory_scope="session+cross-session",
    search_token_tier="none",                    # Hermes performs no direct search
)
```


### LangSmith Tracing

All LLM calls, tool invocations, and retrieval calls are traced to LangSmith project `misjustice-alliance-firm`. Tracing is enabled for every production session with no opt-out.

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

Hermes loads [`SOUL.md`](./SOUL.md) at initialization as its **persistent identity constitution**. SOUL.md is not a persona or a style guide — it is a behavioral commitment document that governs every session regardless of context or instruction pressure.

### Load Order

```
1. SOUL.md          → persistent identity (who Hermes is, core values, hard limits)
2. system_prompt.md → operational instructions (how Hermes behaves in this deployment)
3. MemoryPalace     → cross-session operator context (preferences, active matters)
```


### SOUL.md Integrity Verification

At startup, Hermes verifies:

1. `SOUL.md` is present at `agents/hermes/SOUL.md` — **abort on failure**
2. SOUL.md version matches `agent.yaml:identity.soul_md_version` — **abort on mismatch**
3. SOUL.md SHA matches `agent.yaml:identity.soul_md_sha` (`e27607ee1d68c34e418afea105fb801ceb3f14b8`) — **abort on mismatch**

A tampered, missing, or version-mismatched SOUL.md is treated as a critical startup failure. Hermes will not initialize without a verified identity constitution.

### SOUL.md Change Process

Changes to SOUL.md require:

1. Human operator approval
2. A versioned commit to `main` with an updated SHA in `agent.yaml`
3. Hermes reinitialization

SOUL.md changes do not take effect until the file is merged and Hermes restarts. There is no hot-reload path for identity changes.

---

## 7. System Prompt Contract

[`system_prompt.md`](./system_prompt.md) is the runtime behavioral instruction set for every Hermes session. It defines:


| Section | Content |
| :-- | :-- |
| **Who You Are** | Runtime identity declaration — AI agent, interface layer only, not an attorney |
| **Operating Context** | Full platform stack, mission stakes, privacy and accuracy requirements |
| **Operator Instruction Handling** | Mandatory 4-step sequence: Parse → Confirm → Check Policy → Dispatch → Track |
| **Task Type Routing** | Per-task-type routing table: crew, workflow, HITL gates, Hermes role for each of 8 task types |
| **Skill Factory Protocol** | 6-step sequence with explicit statement that verbal approval is insufficient |
| **Policy Conflict Handling** | 3-scenario handling: operator conflict, Veritas violation alert, unverifiable output |
| **Output Format Standards** | 6 named format blocks with exact templates (see Section 7.1) |
| **Hard Limits — Runtime** | All 8 SOUL.md hard limits restated as runtime instructions |
| **What You Do Not Do** | 15 explicit exclusions with correct routing for each |
| **Memory Usage** | Explicit write-list, do-not-write-list, session startup retrieval protocol |
| **Tone and Style** | 6 attributes: direct, precise, calibrated, concise, respectful, non-flattering |
| **Session Startup Sequence** | 5-step startup ritual with platform status block format |
| **Disclaimer** | Mandatory verbatim legal disclaimer on all qualifying outputs |

### 7.1 Output Format Templates

Six canonical output blocks are defined in the system prompt and must be used without deviation:

**Intent Confirmation Block** — required before every task dispatch:

```
**Hermes — Intent Confirmation**
Goal: [plain-language summary]
Crew / Workflow: [crew] → [workflow]
Matter ID: [ID or not yet assigned]
Agents: [list]
HITL gates: [list]
Estimated output: [description]
Risks / notes: [flags]
Proceed? [yes / no / modify]
```

**Task Status Update:**

```
**Hermes — Task Update**
Task ID: [task_id]
Status: [pending / running / awaiting-hitl / complete / failed]
Current stage: [agent name — what it is doing]
Next HITL gate: [gate name — what operator needs to do]
ETA: [estimate or "unknown"]
```

**HITL Approval Request:**

```
**Hermes — Action Required**
Gate: [gate_id]
Task ID: [task_id]
Matter: [matter title / ID]
Requesting agent: [agent name]
Summary: [what agent produced or is requesting authorization for]
What you need to do: [specific action]
Approve / Defer / Reject: [command or URL]
Timeout: [expiry and consequence]
```

**Research Output Delivery** — always includes mandatory disclaimer:

```
**Hermes — Research Output Ready**
Task ID: [task_id] · Matter ID: [matter_id]
Produced by: [agent(s)]
Output location: [Open Notebook path / MCAS task record]
Summary: [2–4 sentence plain-language summary]
Key gaps or caveats: [agent-flagged gaps]
Suggested next steps: [optional]
Next workflow stage: [if operator approves]

***
⚠️ RESEARCH AND ADVOCACY PURPOSES ONLY
[verbatim disclaimer]
```

**Policy Conflict:**

```
**Hermes — Policy Conflict**
Instruction received: [operator's instruction, verbatim]
Conflict: [specific policy or hard limit]
Reason: [plain-language explanation]
Recommended path: [alternative approach]
```

**Violation Alert:**

```
**Hermes — VIOLATION ALERT** ⛔
Severity: [critical / high / medium]
Agent: [agent name] · Violation: [policy breached]
Action taken: [what the agent did] · Timestamp: [ISO 8601]
Status: [locked / running / suspended]
Required: Human Oversight Board review via violation escalation gate.
Gate ID: [gate_id]
```


---

## 8. Tool Interface Contracts

All Hermes tools are LangChain `BaseTool` subclasses defined in `agents/base/tools/`. Tool access is enforced at two layers: the `agent.yaml` tool list (availability) and `hermes_policy.paperclip.yaml` (runtime allow/deny).

### 8.1 OpenClaw Dispatch

```python
class OpenClawDispatchInput(BaseModel):
    crew: str                    # e.g., "LegalResearchCrew"
    workflow: str                # e.g., "research_workflow"
    matter_id: str               # MCAS matter ID or "unassigned"
    scope_summary: str           # Plain-language task scope
    priority: int                # 1 (highest) – 5 (lowest)
    authorized_by: str           # Operator handle
    hitl_gates_expected: list[str]

# Returns:
# { task_id: str, status: "pending", crew: str, workflow: str, assigned_at: ISO8601 }
```

**Confirmation required:** Always. Hermes must present the intent confirmation block and receive operator approval before calling this tool.

### 8.2 OpenClaw Task Status

```python
class OpenClawTaskStatusInput(BaseModel):
    task_id: str

# Returns:
# { task_id, status, current_agent, current_stage, hitl_gate_pending, eta, output_location }
```


### 8.3 n8n HITL Trigger

```python
class N8nTriggerHITLInput(BaseModel):
    gate_id: str                 # Canonical gate ID from agent.yaml hitl.gates
    task_id: str
    matter_id: str
    requesting_agent: str
    summary: str                 # What the agent produced or is requesting
    approval_channels: list[str] # Must match gate configuration

# Returns:
# { execution_id: str, status: "triggered", gate_id: str, timeout_at: ISO8601 }
```

**Confirmation not required** for trigger calls — n8n routing is non-destructive. Hermes triggers but does not resolve gates.

### 8.4 MemoryPalace Write

```python
class MemoryPalaceWriteInput(BaseModel):
    key: str                     # Namespaced key: "{agent}/{scope}/{topic}"
    value: str                   # Content to persist
    category: str                # One of: operator_preferences | delegation_history |
                                 #   approved_workflow_patterns | skill_factory_registry |
                                 #   hitl_gate_outcomes | operator_session_context
    classification: str          # Must be "tier2" or lower — enforced by Paperclip
    matter_id: Optional[str]     # Omit if not matter-scoped

# Returns:
# { key: str, stored_at: ISO8601, classification: str }
```

**Classification ceiling enforced:** Hermes will receive a Paperclip policy rejection if it attempts to write Tier-0 or Tier-1 material to MemoryPalace.

### 8.5 MCAS Read (Matter Summary)

```python
class MCASReadMatterSummaryInput(BaseModel):
    matter_id: str

# Returns (Tier-2 only — no PII, no Tier-0/1 documents):
# { matter_id, title, phase, category, jurisdiction, key_dates, open_tasks_count }
```


### 8.6 Skill Factory Generate

```python
class SkillFactoryGenerateInput(BaseModel):
    skill_name: str              # snake_case identifier
    description: str             # What this skill does
    tools_used: list[str]        # LangChain tools or APIs the skill will use
    scope_summary: str           # Which workflow/crew this skill supports
    risk_notes: str              # Any policy or safety implications

# Returns:
# { skill_name, output_path: "skills/hermes_skills/{skill_name}.py",
#   review_status: "pending", generated_at: ISO8601 }
```

**Confirmation required:** Always. Hermes presents the skill metadata and receives operator approval before generating.

### 8.7 Spawn Transient Subagent

```python
class SpawnTransientSubagentInput(BaseModel):
    task_summary: str
    input: dict
    tier: str                    # "tier2" or lower
    llm_model: str               # e.g., "claude-3-5-haiku" for cheap/fast tasks
    tools: list[str]
    sandbox_policy: str          # Path to OpenShell policy file
    ttl_seconds: int             # Max 600
    high_privilege: bool         # Triggers HITL gate if True
    external_facing: bool        # Triggers HITL gate if True

# Returns:
# { subagent_id, status: "provisioning", sandbox_id, ttl_seconds, task_id }
```

**Confirmation required:** Always. High-privilege and external-facing spawns require a completed `subagent_spawn_authorization` HITL gate before NemoClaw is called.

---

## 9. Task Delegation Pipeline

The complete flow from operator instruction to OpenClaw dispatch:

```
Operator natural-language instruction
        │
        ▼
┌──────────────────────────────────┐
│  classify_operator_intent        │  Internal tool — not exposed to operator
│  → { crew, workflow, matter_id,  │
│    scope_summary, hitl_gates }   │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│  Intent Confirmation Block       │  Mandatory — no bypass
│  Operator confirms or modifies   │
└──────────────────┬───────────────┘
                   │ Operator: "yes"
                   ▼
┌──────────────────────────────────┐
│  paperclip_agent_status          │  Check target agent(s) are healthy
│  If degraded → surface to        │  and running expected version
│  operator before proceeding      │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│  openclaw_dispatch               │  Submit structured task payload
│  → task_id                       │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│  openclaw_task_status polling    │  Track task state
│  Surface HITL gates as triggered │  Relay approval requests via n8n_trigger_hitl
│  Surface completion output       │  Return output with caveats and disclaimer
└──────────────────────────────────┘
```


### Task Payload Schema

```json
{
  "task_id": "<uuid-v4>",
  "matter_id": "<MCAS-matter-id>",
  "crew": "LegalResearchCrew",
  "workflow": "research_workflow",
  "priority": 2,
  "input": {
    "scope": "<plain-language scope from operator>",
    "authorized_by": "<operator-handle>",
    "hitl_gates_expected": ["research_scope_authorization"]
  },
  "assigned_at": "<ISO8601>",
  "status": "pending",
  "audit_trail": []
}
```


### Task Routing Table

| Task Type | Crew | Workflow | Key HITL Gates |
| :-- | :-- | :-- | :-- |
| New Matter Intake | `IntakeCrew` | `intake_workflow` | `intake_approval` |
| Legal Research | `LegalResearchCrew` | `research_workflow` | `research_scope_authorization` |
| Pattern-of-Practice Analysis | `LegalResearchCrew` | `research_workflow` | `research_scope_authorization` |
| PI / OSINT Investigation | `LegalResearchCrew` | `research_workflow` | `research_scope_authorization` (**mandatory, no bypass**) |
| External Referral Packet | `ReferralCrew` | `referral_workflow` | `referral_approval` |
| Web Publication | `PublicationCrew` | `publication_workflow` | `publication_approval` |
| Social Media Campaign | `PublicationCrew` | `social_campaign_workflow` | `social_campaign_approval` |
| Outreach Drafting | `OutreachCrew` | `outreach_workflow` | AgenticMail approval queue |


---

## 10. HITL Gate Architecture

All Human-in-the-Loop flows route through **n8n** (self-hosted). Hermes triggers webhooks via `n8n_trigger_hitl` and polls status via `n8n_workflow_status`. Hermes never resolves gates — it only surfaces them and waits.

### Gate Lifecycle

```
Task reaches gate trigger point
        │
        ▼
Hermes calls n8n_trigger_hitl → n8n execution_id returned
        │
        ▼
n8n routes approval request to operator channel(s)
(Hermes CLI · Telegram · Open Web UI · Discord HOB)
        │
        ▼
Operator acts (approve / defer / reject)
        │
        ▼
n8n webhook POSTs resolution to OpenClaw
        │
        ▼
Hermes receives resolution via openclaw_task_status
        │
        ▼
Hermes logs outcome to MemoryPalace (hitl_gate_outcomes)
and OpenClaw audit stream
        │
        ▼
Downstream workflow stage continues (if approved)
or pauses / cancels (if deferred / rejected)
```


### Gate Timeout Behavior

| Outcome | Gate | Behavior |
| :-- | :-- | :-- |
| `task_dispatch_confirmation` | 24 h | Escalate to operator |
| `subagent_spawn_authorization` | 4 h | Cancel spawn request |
| `skill_factory_activation` | 72 h | Leave candidate pending in `skills/hermes_skills/` |
| `intake_approval` | 48 h | Defer matter — no MCAS record created |
| `research_scope_authorization` | 24 h | Pause research task — resume on approval |
| `referral_approval` | 72 h | Hold referral packet — no external transmission |
| `publication_approval` | 48 h | Hold publication — no web property updated |
| `social_campaign_approval` | 24 h | Hold social posts — no platform updated |
| `violation_escalation` | 4 h | **Lock affected agent pending HOB review** |
| `deadline_escalation` | 8 h | Re-escalate to operator |

### Violation Escalation (Critical)

The `violation_escalation` gate is triggered by **Veritas** and routed through Hermes. It has special handling:

1. Hermes surfaces the full Veritas alert to the operator immediately, without minimizing severity
2. The gate routes to `#human-oversight-board` Discord channel in addition to standard operator channels
3. Timeout behavior is **lock affected agent** — not defer or cancel
4. Hermes cannot resolve this gate autonomously under any circumstances
5. Priority: `critical` — this gate takes precedence over all other pending items in the operator queue

---

## 11. Skill Factory Subsystem

The Skill Factory is a meta-agent capability that allows the platform to extend its own tool set without full redeployment. It is governed by two absolute hard gates that cannot be bypassed.

### Two Hard Activation Gates

```
Gate 1: Human approval of candidate skill file
        (written to skills/hermes_skills/ — NOT active)
                │
                ▼
Gate 2: Git merge of approved file to main
        (triggers Hermes tool registry reload on next session start)
```

Verbal operator approval is explicitly insufficient. The activation path requires a traceable, versioned Git merge.

### Skill Factory Pipeline

```
1. Operator request (explicit — Hermes does not propose skills unsolicited)
        │
        ▼
2. Hermes confirms metadata with operator:
   skill_name · description · tools_used · scope_summary · risk_notes
   → Skill Factory Confirmation Block presented
        │ Operator approves
        ▼
3. skill_factory_generate called
   → Writes to skills/hermes_skills/{skill_name}.py
   → Status: "pending" written to skills/hermes_skills/registry.yaml
   → Event logged to MemoryPalace (skill_factory_registry) and audit stream
        │
        ▼
4. Operator reviews file in repository
        │
        ▼
5. Operator merges to main (Git gate)
        │
        ▼
6. Hermes reloads skill into active tool registry on next session start
   → Status updated to "approved" in registry.yaml
```


### Required Skill File Metadata

Every candidate skill file must include a header block:

```python
# SKILL METADATA
# skill_name: {skill_name}
# description: {description}
# tools_used: {comma-separated list}
# scope_summary: {which crew/workflow this supports}
# risk_notes: {policy or safety implications}
# generated_by_hermes_version: 1.0.0
# generated_at: {ISO8601}
# review_status: pending  ← changed to "approved" after merge
```


### Registry File Schema

`skills/hermes_skills/registry.yaml`:

```yaml
skills:
  - skill_name: example_skill
    description: "..."
    review_status: pending       # pending | approved | rejected
    generated_at: "2026-04-10T00:00:00Z"
    approved_at: null
    approved_by: null
    git_merge_sha: null
```


---

## 12. Subagent Spawn Architecture

Hermes can request NemoClaw to provision **transient subagents** via OpenShell for one-shot parallelized tasks. Transient subagents are not registered in Paperclip and self-destroy after their TTL.

### Spawn Flow

```
Hermes (spawn_transient_subagent tool)
        │
        ▼
NemoClaw receives spawn request
        │
        ▼  [if high_privilege=True or external_facing=True]
subagent_spawn_authorization HITL gate triggered
        │ Operator approves
        ▼
NemoClaw calls OpenShell to provision sandbox
        │
        ▼
Sandbox created with openclaw base image
Policy applied from services/openshell/policies/{policy_file}
        │
        ▼
LangChain agent executor starts inside sandbox
Task executes within sandbox constraints
        │
        ▼
Task completes → output written to /app/outputs/
        │
        ▼
OpenShell sandbox destroyed
Audit event emitted to Veritas feed
```


### Spawn Policy Constraints

| Parameter | Value |
| :-- | :-- |
| Max concurrent subagents | 3 |
| Default TTL | 120 seconds |
| Max TTL | 600 seconds |
| Base image | `openclaw` (OpenShell community catalog) |
| Paperclip registration | No — transient only |
| High-privilege definition | External network access · MCAS writes · PI-tier search |
| External-facing definition | AgenticMail · public web properties · social platforms |


---

## 13. Memory Architecture

Hermes uses **MemoryPalace** (MCP-integrated, locally-run) for cross-session persistence.

### Memory Scope Model

```
Session memory     → active only during current session
                   → discarded on session end unless promoted to cross-session
                   → stores: current task IDs, active matter IDs, session intent

Cross-session      → persisted indefinitely, subject to periodic review
                   → stores: operator preferences, delegation history,
                              approved patterns, skill registry, gate outcomes
```


### Classification Ceiling

Hermes has a **Tier-2 classification ceiling** on all MemoryPalace operations. This is enforced at two layers:

1. `agent.yaml:memory.classification_ceiling: tier2`
2. `hermes_policy.paperclip.yaml` — Paperclip rejects any write call that would store Tier-0 or Tier-1 content

### What Hermes Writes to Memory

| Category | Contents | Scope |
| :-- | :-- | :-- |
| `operator_preferences` | Communication style, verbosity level, notification channel preferences | Cross-session |
| `delegation_history` | Task dispatches: crew, workflow, matter_id, outcome, timestamp | Cross-session |
| `approved_workflow_patterns` | Operator-confirmed recurring task patterns | Cross-session |
| `skill_factory_registry` | Skills generated, reviewed, approved, or rejected | Cross-session |
| `hitl_gate_outcomes` | Approvals/rejections: gate_id, matter_id, operator, timestamp, decision | Cross-session |
| `operator_session_context` | Active matter IDs and task IDs (IDs only — never case content) | Session |

### What Hermes Never Writes to Memory

- Tier-0 or Tier-1 material of any kind
- Unredacted personal identifiers
- Case-specific facts, evidence details, or legal strategy
- Content that belongs in MCAS (case records belong in MCAS, not agent memory)


### Session Startup Memory Retrieval

At every session start, Hermes retrieves:

1. Operator preferences for the active operator handle
2. Any pending HITL gates with open status from prior sessions
3. Active matter IDs and task IDs with non-terminal status

---

## 14. LLM Routing and Fallback

All LLM calls route through **LiteLLM** proxy, enabling unified observability, model swapping, and local fallback without agent code changes.

### Routing Chain

```
Request → LiteLLM proxy ($LITELLM_BASE_URL)
              │
              ├─ Primary:  gpt-4o
              ├─ Fallback: claude-3-5-sonnet-20241022
              └─ Local:    Ollama / llama3 ($OLLAMA_BASE_URL)
                           [activated when external providers unreachable]
```


### Configuration

| Parameter | Value | Rationale |
| :-- | :-- | :-- |
| Temperature | `0.2` | Low — Hermes prioritizes precision and consistency over creativity |
| Max tokens | `4096` | Sufficient for all Hermes output blocks plus context |
| Streaming | `true` | Responses streamed to operator CLI / TUI for responsiveness |
| Local fallback trigger | `external_unavailable` | Auto-activates when LiteLLM cannot reach external providers |

### LangSmith Tracing

Every LLM call and tool invocation is traced to LangSmith project `misjustice-alliance-firm`. Traces are visible to Veritas via the audit stream and available to operators for session review.

---

## 15. Sandbox Runtime

Every Hermes task dispatch runs inside a **fresh OpenShell sandbox** provisioned by NemoClaw. Sandboxes enforce four policy layers:


| Layer | Mechanism | Reloadable |
| :-- | :-- | :-- |
| Filesystem isolation | Mount namespaces — read/write restricted to declared paths only | No — locked at creation |
| Network policy | eBPF-based egress/ingress — only whitelisted internal endpoints permitted | Yes — hot-reload |
| Process isolation | seccomp + namespace isolation — privilege escalation blocked | No — locked at creation |
| Inference routing | Privacy-aware LLM proxy — strips caller credentials, injects backend credentials | Yes — hot-reload |

### Hermes Sandbox Network Allowlist

Hermes sandboxes may egress only to:

```yaml
allowed_egress:
  - host: openclaw.internal       port: 8080    # Task dispatch and status
  - host: paperclip.internal      port: 443     # Agent health checks
  - host: n8n.internal            port: 5678    # HITL webhook triggers
  - host: memorypalace.internal   port: 7700    # MemoryPalace MCP
  - host: mcas.internal           port: 8443    # MCAS read (Tier-2 only)
  - host: litellm.internal        port: 4000    # LLM proxy
# All other egress: denied by default
```


### Sandbox Lifecycle

```
NemoClaw receives dispatch request from Hermes
    → openshell sandbox create --from openclaw --agent hermes
    → openshell policy set hermes-{task_id} --policy hermes_policy.yaml
    → LangChain executor starts inside sandbox
    → Task executes within constraints
    → Output written to /app/outputs/
    → openshell sandbox destroy hermes-{task_id}
    → Audit event emitted to Veritas
```

TTL: 300 seconds. Sandbox auto-destroys after 5 minutes idle, regardless of task state.

---

## 16. Notification and Messaging Architecture

Hermes delivers status updates, HITL approval requests, and violation alerts through three channels:


| Channel | Used For | Config |
| :-- | :-- | :-- |
| **Telegram** | Task status updates · HITL approval requests · violation alerts | `$TELEGRAM_BOT_TOKEN` · `$TELEGRAM_OPERATOR_CHAT_ID` |
| **Discord `#human-oversight-board`** | `violation_escalation` gate · team coordination | `$DISCORD_WEBHOOK_URL` |
| **iMessage** (via Telegram bridge) | Urgent operator alerts | Delivered via Telegram bridge — no direct iMessage integration |

### Delivery Guarantee

HITL approval requests are delivered to all configured channels for the relevant gate simultaneously. Operators may respond from any channel. n8n records the resolution source for audit purposes.

---

## 17. Observability and Audit

### Audit Stream

All Hermes activity is emitted to the **OpenClaw audit stream**, which feeds into **Veritas** (the platform's integrity monitor). Every audited event includes: `event_type`, `agent_id`, `task_id`, `matter_id` (where applicable), `operator_handle`, `timestamp (ISO8601)`, and `outcome`.

**Audited events:**


| Category | Events |
| :-- | :-- |
| Session | `session_start` · `session_end` |
| Task management | `task_dispatched` · `task_status_queried` · `task_cancelled` |
| HITL | `hitl_gate_triggered` · `hitl_gate_resolved` |
| Skill Factory | `skill_factory_skill_generated` · `skill_factory_skill_activated` |
| Subagent | `subagent_spawned` · `subagent_destroyed` |
| Policy | `policy_conflict_surfaced` · `hard_limit_invoked` |
| Memory | `memory_write` · `memory_read` |

### LangSmith Tracing

Full LLM call and tool invocation tracing to LangSmith project `misjustice-alliance-firm`. Traces are immutable and used for:

- Debugging unexpected Hermes outputs
- LangSmith evaluation runs against behavior test cases
- Post-incident review of specific sessions


### Veritas Integration

`agent.yaml:observability.veritas_feed: true` — all Hermes audit events are visible to Veritas in real time. Veritas monitors for policy violations including silent compliance (outputs that comply with policy-conflicting instructions without surfacing the conflict).

---

## 18. Hard Limit Enforcement Model

Each of Hermes's 8 hard limits is enforced at multiple independent layers. A single-layer bypass does not defeat the constraint.


| Hard Limit | Behavioral Layer | Policy Layer | Runtime Layer |
| :-- | :-- | :-- | :-- |
| No legal advice | SOUL.md · system prompt · output format templates with mandatory disclaimer | — | LangSmith output evaluation flags missing disclaimer |
| No Tier-0 handling | SOUL.md · system prompt explicit redirect to Proton | Paperclip deny: `mcas_read_tier0` · MemoryPalace Tier-2 ceiling | MCAS OAuth2 scope absence · OpenShell network policy |
| No autonomous publication | SOUL.md · system prompt | Paperclip deny: `gitbook_publish` · `social_post_any` · `publication_approval` HITL gate (no bypass) | denied tools enforced at tool binding initialization |
| No autonomous external transmission | SOUL.md · system prompt | Paperclip deny: `agenticmail_send` · `proton_send` · referral HITL gate (no bypass) | denied tools enforced at tool binding initialization |
| No identity fabrication | SOUL.md · system prompt | — | LangSmith output evaluation |
| No scope override | SOUL.md · system prompt | Paperclip RBAC — Hermes has no write access to other agents' manifests | denied tools: no tool that modifies other agent configs |
| No silent compliance | SOUL.md · system prompt explicit instruction | — | LangSmith evaluation flags compliant outputs without surfaced conflicts |
| No case data in Git | SOUL.md · system prompt | Paperclip: no `git_write` tool | Pre-commit hooks: `detect-secrets` + keyword scan · `.gitignore: cases/` |


---

## 19. Data Classification Compliance

The platform uses a four-tier classification model. Hermes enforces Tier-2 ceilings across all data interactions.


| Tier | Label | Hermes Access |
| :-- | :-- | :-- |
| Tier-0 | EYES-ONLY | **Never** — Tier-0 never enters the agent pipeline. If operator shares Tier-0 content, Hermes redirects to Proton and explains why. |
| Tier-1 | RESTRICTED | **Never** — Tier-1 access requires explicit human gate. Paperclip deny rules and MCAS OAuth2 scope absence enforce this. |
| Tier-2 | INTERNAL | **Read-only via `mcas_read_matter_summary` and `mcas_read_task_status`** — de-identified working data only (matter titles, phases, task status). |
| Tier-3 | PUBLIC-SAFE | Not in Hermes tool set — Tier-3 access belongs to Sol, Quill, Webmaster, Social Manager. |


---

## 20. Health Check Specification

### Startup Checks

Run sequentially at initialization. Abort checks halt the entire startup process.


| Check | Target | Method | On Failure |
| :-- | :-- | :-- | :-- |
| `soul_md_present` | `agents/hermes/SOUL.md` | File read | **Abort** — SOUL.md missing or unreadable |
| `soul_md_version_match` | `agent.yaml:identity.soul_md_version` | String compare | **Abort** — version mismatch, reinitialization required |
| `soul_md_sha_match` | `agent.yaml:identity.soul_md_sha` | SHA compare | **Abort** — identity constitution may have been tampered with |
| `openclaw_reachable` | `$OPENCLAW_API_URL` | HTTP GET `/health` | **Abort** — cannot dispatch tasks |
| `n8n_reachable` | `$N8N_BASE_URL` | HTTP GET `/healthz` | **Abort** — HITL gates cannot be routed |
| `paperclip_reachable` | `$PAPERCLIP_API_URL` | HTTP GET `/health` | **Warn** — continue, Paperclip may start after Hermes |
| `memorypalace_reachable` | `$MEMORYPALACE_MCP_URL` | MCP ping | **Warn** — continue in degraded stateless mode |
| `litellm_reachable` | `$LITELLM_BASE_URL` | HTTP GET `/health` | **Warn** — fall back to Ollama |

### Periodic Checks (every 60 seconds)

| Check | Action on Failure |
| :-- | :-- |
| `paperclip_agent_health_all` | Surface degraded agent list to operator on next interaction |
| `n8n_pending_hitl_queue_depth` | Alert operator if pending gate count exceeds threshold |
| `openclaw_task_queue_depth` | Alert operator if queue depth exceeds threshold |
| `memorypalace_connectivity` | Warn operator if memory MCP becomes unreachable mid-session |


---

## 21. Initialization Sequence

```
1. Load SOUL.md from agents/hermes/SOUL.md
   → Verify version and SHA match agent.yaml
   → Abort on any mismatch

2. Load system_prompt.md from agents/hermes/system_prompt.md
   → Construct ChatPromptTemplate

3. Initialize LiteLLM-backed LLM (gpt-4o primary)
   → Fall back to Ollama if LiteLLM unreachable

4. Bind tool set (17 tools from agents/base/tools/)
   → Confirm all tool class imports resolve
   → Apply Paperclip policy (hermes_policy.paperclip.yaml)

5. Run startup health checks (see Section 20)
   → Abort on hard failures
   → Continue with warnings on soft failures

6. Initialize MemoryPalace MCP connection
   → Retrieve operator context, active matters, pending HITL gates

7. Initialize LangSmith tracing
   → Register session with misjustice-alliance-firm project

8. Build AgentExecutor (MISJusticeBaseAgent)
   → Attach tools, prompt, memory, executor config

9. Surface platform status block to operator:
   **Hermes — Platform Status**
   Platform health: [summary]
   Open tasks: [count and list]
   Pending HITL gates: [count and list]
   Active matters: [count]
   Ready.
```


---

## 22. Session Lifecycle

```
SESSION START
    → Initialization sequence (Section 21)
    → Retrieve operator context from MemoryPalace
    → Surface platform status block

ACTIVE SESSION
    → Receive operator instruction
    → Classify intent (classify_operator_intent)
    → Present intent confirmation block
    → Check platform health (paperclip_agent_status)
    → Dispatch task (openclaw_dispatch)
    → Track task and route HITL gates
    → Surface output with caveats and disclaimer

SESSION END
    → Write session summary to MemoryPalace (promote key items to cross-session)
    → Discard session-scope memory entries not promoted
    → Emit session_end audit event
    → Sandbox auto-destructs (TTL enforcement)
```


---

## 23. Failure Modes and Degraded Operation

| Failure | Impact | Hermes Behavior |
| :-- | :-- | :-- |
| OpenClaw unreachable | Cannot dispatch tasks | Startup abort — Hermes will not start without task queue |
| n8n unreachable | Cannot route HITL gates | Startup abort — no HITL means no safe operation |
| Paperclip unreachable | Cannot verify agent health | Start with warning; notify operator before each dispatch that health check was skipped |
| MemoryPalace unreachable | No cross-session memory | Start in stateless degraded mode; notify operator; session memory only |
| LiteLLM unreachable | No external LLM | Fall back to Ollama/llama3 automatically; notify operator of model change |
| Ollama unreachable | No LLM at all | Abort — Hermes requires at least one LLM to be reachable |
| LangSmith unreachable | No distributed tracing | Warn and continue; local audit stream remains active |
| SOUL.md missing or tampered | Identity integrity failure | **Abort** — Hermes will not run without a verified identity constitution |
| Sandbox provisioning failure | Task cannot execute | Surface failure to operator; offer to retry or cancel |
| Veritas violation alert | Downstream agent policy breach | Surface full alert immediately; route to violation_escalation HITL gate; do not minimize |


---

## 24. Security Considerations

### Zero-Trust Tool Access

Hermes has no implicit access to any platform service. Every tool call is:

1. Scoped to the exact service it needs (no broad API keys)
2. Enforced by Paperclip policy at runtime
3. Sandboxed via OpenShell network policy (egress whitelist)
4. Traced to LangSmith and the OpenClaw audit stream

### Secret Management

All credentials are injected via environment variables — never hardcoded in agent files or committed to the repository:

```
LITELLM_BASE_URL · LITELLM_MASTER_KEY
LANGCHAIN_API_KEY
PAPERCLIP_API_URL · PAPERCLIP_API_KEY
OPENCLAW_API_URL · OPENCLAW_API_KEY
N8N_BASE_URL · N8N_WEBHOOK_SECRET
MEMORYPALACE_MCP_URL · MEMORYPALACE_API_KEY
MCAS_API_URL · MCAS_API_KEY
OPENSHELL_GATEWAY_URL · OPENSHELL_API_KEY
TELEGRAM_BOT_TOKEN · TELEGRAM_OPERATOR_CHAT_ID
DISCORD_WEBHOOK_URL
HERMES_API_KEY
OPEN_WEBUI_URL
OLLAMA_BASE_URL
```


### Pre-Commit Protection

The repository enforces `detect-secrets` and keyword scanning on every commit. Combined with `.gitignore` (`cases/` directory) and the Paperclip `no_git_write` constraint, this provides layered protection against case data entering the repository.

### Operator Authentication

Hermes API (headless mode, port 7860) requires `HERMES_API_KEY` authentication. CLI and TUI modes rely on host-level access controls. Operator handles are logged in the audit stream for every task dispatch and HITL gate event.

---

## 25. Configuration Reference

Key environment variables required for Hermes operation:


| Variable | Required | Purpose |
| :-- | :-- | :-- |
| `LITELLM_BASE_URL` | ✅ | LiteLLM proxy endpoint |
| `LITELLM_MASTER_KEY` | ✅ | LiteLLM authentication |
| `LANGCHAIN_API_KEY` | ✅ | LangSmith tracing |
| `OPENCLAW_API_URL` | ✅ | Task dispatch and status |
| `N8N_BASE_URL` | ✅ | HITL webhook routing |
| `N8N_WEBHOOK_SECRET` | ✅ | Webhook authentication |
| `PAPERCLIP_API_URL` | ⚠️ | Agent health and policy enforcement |
| `PAPERCLIP_API_KEY` | ⚠️ | Paperclip authentication |
| `MEMORYPALACE_MCP_URL` | ⚠️ | Cross-session memory (stateless mode if absent) |
| `MEMORYPALACE_API_KEY` | ⚠️ | MemoryPalace authentication |
| `OPENSHELL_GATEWAY_URL` | ⚠️ | Sandbox provisioning |
| `OPENSHELL_API_KEY` | ⚠️ | OpenShell authentication |
| `OLLAMA_BASE_URL` | ⚠️ | Local LLM fallback |
| `TELEGRAM_BOT_TOKEN` | ⚠️ | Notification delivery |
| `TELEGRAM_OPERATOR_CHAT_ID` | ⚠️ | Operator Telegram channel |
| `DISCORD_WEBHOOK_URL` | ⚠️ | HOB violation escalation |
| `HERMES_API_KEY` | ⚠️ | API mode authentication |
| `OPEN_WEBUI_URL` | ⚠️ | Browser workspace URL |

✅ = required for startup · ⚠️ = required for full operation, warn-and-continue if absent

---

## 26. File Reference

```
agents/hermes/
├── README.md               ← High-level overview and operator reference
├── SPEC.md                 ← This file — engineering specification
├── SOUL.md                 ← Persistent identity constitution (loaded at init)
├── agent.yaml              ← Authoritative runtime configuration (Paperclip-registered)
└── system_prompt.md        ← Operational behavioral instructions

skills/hermes_skills/
├── registry.yaml           ← Skill Factory registry (generated, approved, rejected)
└── *.py                    ← Candidate skill files (pending human review)

services/openshell/policies/
└── hermes_policy.yaml      ← OpenShell sandbox policy for Hermes tasks

agents/base/
├── agent.py                ← MISJusticeBaseAgent base class
└── tools/
    ├── openclaw_dispatch.py
    ├── openclaw_task_status.py
    ├── openclaw_task_cancel.py
    ├── paperclip_agent_status.py
    ├── paperclip_agent_list.py
    ├── n8n_trigger_hitl.py
    ├── n8n_workflow_status.py
    ├── memorypalace_write.py
    ├── memorypalace_read.py
    ├── memorypalace_list_scope.py
    ├── mcas_read_matter_summary.py
    ├── mcas_read_task_status.py
    ├── open_notebook_write.py
    ├── skill_factory_generate.py
    ├── skill_factory_list.py
    ├── spawn_transient_subagent.py
    ├── classify_operator_intent.py   ← internal, not operator-exposed
    └── _skill_template.py            ← Skill Factory base template
```


---

## 27. Design Decisions and Rationale

| Decision | Rationale |
| :-- | :-- |
| **Hermes is not a crewAI crew member** | Hermes sits above crew execution as the human interface layer. Making it a crew member would blur the boundary between operator control and autonomous agent coordination, creating ambiguity about who is directing what. |
| **SOUL.md SHA pinned in agent.yaml** | Identity integrity must be verifiable at startup. A SHA mismatch could indicate tampering, an out-of-sync deployment, or an unauthorized SOUL.md change. All three cases warrant an abort. |
| **Hermes has zero direct search access** | Allowing Hermes to search directly would blur the role boundary between interface and research execution, and would bypass the tiered token enforcement model. All search is routed through Rae, Lex, or Iris based on required tier and research type. |
| **Temperature 0.2** | Hermes is a control agent. Its primary outputs are structured task payloads, status updates, confirmation blocks, and policy conflict notices. Precision and consistency are more important than generative creativity. |
| **Two hard gates for Skill Factory activation** | Verbal approval is ambiguous and untraceable. Requiring both human approval of the file and a Git merge to `main` creates a traceable, reversible, audited activation path aligned with GitOps principles. |
| **Startup abort on SOUL.md failure** | An agent that initializes without its identity constitution has no behavioral commitments to enforce. This is more dangerous than an agent that refuses to start. Fail-closed is the correct default for an interface agent handling sensitive legal matters. |
| **n8n for HITL routing** | n8n provides self-hosted, auditable, multi-channel workflow automation. The operator retains full control over the HITL routing logic without dependency on external SaaS platforms. Webhook-based integration is straightforward to implement, test, and monitor. |
| **MemoryPalace for agent memory** | MemoryPalace provides verbatim recall, MCP integration, and local-first operation — ensuring agent memory never leaves the operator's infrastructure. Classification ceiling enforcement at the MCP layer provides an additional data classification control point. |


---

## 28. Known Gaps and Future Work

| Item | Priority | Notes |
| :-- | :-- | :-- |
| `hermes_policy.paperclip.yaml` — full policy file | High | `agent.yaml` references this file; it must be created and committed before production deployment |
| `services/openshell/policies/hermes_policy.yaml` | High | OpenShell sandbox policy for Hermes tasks — required for NemoClaw provisioning |
| `agents/base/tools/` — all 17 tool implementations | High | Tool interface contracts are specified in Section 8; implementations must be built against these schemas |
| EVALS.yaml — behavioral test suite | Medium | LangSmith evaluation test cases for: intent classification accuracy, confirmation block format compliance, HITL gate triggering correctness, hard limit invocation, disclaimer presence |
| RUNBOOK.md — operational guide | Medium | Startup, rollback, degraded mode operation, common failure modes |
| POLICY.md — human-readable policy document | Medium | Operator-facing policy reference aligned with `hermes_policy.paperclip.yaml` |
| GUARDRAILS.yaml — machine-readable guardrails | Medium | Agent-level guardrail config extending global guardrails |
| METRICS.md — observability targets | Low | Success rate, HITL gate response time, policy conflict rate, skill factory throughput |
| Multi-operator session handling | Low | `agent.yaml` supports up to 5 concurrent sessions; session isolation model not yet fully specified |
| Hermes-to-Hermes handoff protocol | Low | For session continuity across restarts; requires MemoryPalace promotion protocol specification |


---

## 29. Governance

| Field | Value |
| :-- | :-- |
| **Agent version** | `1.0.0` |
| **SOUL.md version** | `1.0.0` |
| **SOUL.md SHA** | `e27607ee1d68c34e418afea105fb801ceb3f14b8` |
| **Effective date** | 2026-04-10 |
| **Review cycle** | Every 90 days, or on any platform architecture change affecting Hermes |
| **Change process — behavioral** | Changes to hard limits, HITL gate config, tool access, Skill Factory policy, or data classification rules require: (1) SOUL.md co-review and update, (2) human operator approval before merge to `main`, (3) Hermes reinitialization after merge |
| **Change process — non-behavioral** | Changes to LLM model selection, observability config, health check thresholds, or messaging channels may be made without SOUL.md co-review |
| **Supersedes** | N/A (initial version) |


---

*Hermes — MISJustice Alliance Firm · Engineering Specification*
*SPEC.md v1.0.0 · 2026-04-10*
*This document must remain consistent with SOUL.md v1.0.0, system_prompt.md v1.0.0, and agent.yaml v1.0.0.*
