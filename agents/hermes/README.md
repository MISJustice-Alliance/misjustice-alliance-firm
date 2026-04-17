# Hermes — Human Interface & Control Agent

> **MISJustice Alliance Firm · `agents/hermes/`**
> Platform layer: 1 — Human Interface · Role type: `interface` · Facing: `human`

[![Agent Version](https://img.shields.io/badge/version-1.0.0-blue)](./agent.yaml)
[![SOUL.md](https://img.shields.io/badge/SOUL.md-v1.0.0-purple)](./SOUL.md)
[![Framework](https://img.shields.io/badge/framework-LangChain%20%2B%20LangSmith-green)](https://docs.smith.langchain.com/agent-builder)
[![Control Plane](https://img.shields.io/badge/control%20plane-Paperclip-orange)](https://docs.paperclip.ing/start/what-is-paperclip)
[![HITL](https://img.shields.io/badge/HITL-n8n-red)](https://n8n.io)

---

Hermes is the **primary human-facing control agent** for the MISJustice Alliance Firm platform. It is the sole entry point through which operators interact with the full agent stack — translating natural-language instructions into structured task dispatches, surfacing agent outputs back to operators with full context and caveats, managing all Human-in-the-Loop (HITL) approval flows, and governing the Skill Factory for platform self-evolution.

Hermes is **not** a researcher, a legal analyst, or an autonomous actor. It is a precision instrument for human operators — built to amplify human capability and protect human authority at every layer of the platform.

---

## Table of Contents

1. [Role & Responsibilities](#role--responsibilities)
2. [Platform Position](#platform-position)
3. [Interface Modes](#interface-modes)
4. [Task Delegation Flow](#task-delegation-flow)
5. [HITL Gate Management](#hitl-gate-management)
6. [Skill Factory](#skill-factory)
7. [Subagent Spawning](#subagent-spawning)
8. [Tool Bindings](#tool-bindings)
9. [Denied Tools](#denied-tools)
10. [Memory](#memory)
11. [LLM Configuration](#llm-configuration)
12. [Sandbox Runtime](#sandbox-runtime)
13. [Hard Limits](#hard-limits)
14. [Observability & Audit](#observability--audit)
15. [Health Checks](#health-checks)
16. [File Reference](#file-reference)
17. [Governance](#governance)

---

## Role & Responsibilities

| Responsibility | Description |
|---|---|
| **Operator Interface** | Single entry point for all natural-language operator commands to the platform |
| **Intent Classification** | Parses operator instructions into structured OpenClaw task payloads |
| **Task Dispatch** | Submits payloads to OpenClaw for crew routing and execution |
| **Task Tracking** | Monitors task status via OpenClaw task IDs and surfaces updates to operators |
| **HITL Routing** | Triggers and surfaces all n8n Human-in-the-Loop approval gates |
| **Output Delivery** | Returns agent outputs to operators with full context, caveats, and mandatory disclaimers |
| **Skill Factory** | Generates candidate LangChain `BaseTool` skills for human review and approval |
| **Subagent Spawning** | Requests NemoClaw to provision transient subagents for parallelized one-shot tasks |
| **Platform Health** | Queries Paperclip for agent health and surfaces platform status to operators |
| **Memory Management** | Persists operator preferences, delegation history, and session context to MemoryPalace |

---

## Platform Position

Hermes sits at **Layer 1** — the human interface boundary. It is the entry point to the platform and the return path for all agent outputs. It does not perform research, legal analysis, or publication. All substantive work is delegated downward through OpenClaw to the appropriate crewAI crews and LangChain agents.

```

Human Operator
↕  ← Hermes lives here
Hermes (Layer 1 — Human Interface)
↓
OpenClaw / NemoClaw  →  crewAI Crews  →  LangChain Agents
↓
Tools: MCAS · OpenRAG · SearXNG
MemoryPalace · LawGlance · n8n

```

Hermes is **not** registered as a crewAI crew member. It sits above the crew execution layer and dispatches to it via OpenClaw.

---

## Interface Modes

| Mode | Launch Command | Description |
|---|---|---|
| **CLI** | `hermes --config agents/hermes/agent.yaml` | Interactive terminal session for task delegation, status checks, and approvals |
| **TUI** | `hermes --config agents/hermes/agent.yaml --tui` | Full terminal UI with agent status dashboard, task queue, approval inbox, HITL pending items, and output viewer |
| **API (Headless)** | Port `7860`, API key auth | Receives structured JSON commands from n8n, Telegram bot relay, or Discord webhook |
| **Open Web UI** | `$OPEN_WEBUI_URL` | Browser-based workspace for agent interaction and output review |

---

## Task Delegation Flow

When an operator issues a natural-language instruction, Hermes executes a mandatory 4-step sequence before any task is dispatched:

1. **Parse & Classify** — Runs `classify_operator_intent` (internal tool) to map the instruction to a structured intent object: `{crew, workflow, matter_id, scope_summary, hitl_gates}`.
2. **Confirm Intent** — Presents a confirmation block to the operator before proceeding. No dispatch occurs without explicit operator confirmation.
3. **Check HITL Gates** — Identifies which approval gates will be triggered during the workflow and notifies the operator upfront.
4. **Dispatch & Track** — Submits the OpenClaw task payload via `openclaw_dispatch` and returns a `task_id` and status to the operator.

**Example:**
```

Operator:  Research excessive force pattern for Officer Doe — all incidents 2022–2025.

Hermes:    Before dispatching — crew: LegalResearchCrew, workflow: research_workflow,
scope: pattern-of-practice / excessive force / Officer J. Doe / 2022–2025.
HITL gate: research_scope_authorization will be triggered before Iris is invoked.
Proceed?

Operator:  Yes.

Hermes:    Task queued: TASK-0042. Awaiting your scope authorization before PI research begins.

```

---

## HITL Gate Management

All Human-in-the-Loop approval flows route through **n8n**. Hermes triggers webhooks and surfaces pending approvals to operators — it does **not** resolve gates autonomously.

### Gates Hermes Triggers Directly

| Gate ID | Trigger Point | Approval Channels | Timeout |
|---|---|---|---|
| `task_dispatch_confirmation` | Before any OpenClaw dispatch (external-facing, PI-tier, or publication tasks) | Hermes CLI · Telegram | 24 h |
| `subagent_spawn_authorization` | Before any high-privilege or external-facing subagent spawn | Hermes CLI · Telegram | 4 h |
| `skill_factory_activation` | Before any Skill Factory output is loaded into the active tool registry | Hermes CLI | 72 h |

### Gates Surfaced from Downstream Agents

| Gate ID | Source Agent | Approval Channels | Timeout | On Timeout |
|---|---|---|---|---|
| `intake_approval` | Avery | Hermes CLI · Telegram | 48 h | Defer matter |
| `research_scope_authorization` | Rae · Iris | Hermes CLI · Telegram | 24 h | Pause research task |
| `referral_approval` | Casey | Hermes CLI · Open Web UI | 72 h | Hold referral packet |
| `publication_approval` | Sol · Webmaster | Hermes CLI · Open Web UI | 48 h | Hold publication |
| `social_campaign_approval` | Social Media Manager | Hermes CLI · Telegram | 24 h | Hold social posts |
| `violation_escalation` | Veritas | Hermes CLI · Discord `#human-oversight-board` | 4 h | Lock affected agent pending review |
| `deadline_escalation` | Atlas | Hermes CLI · Telegram | 8 h | Re-escalate to operator |

> **Violation gates are CRITICAL priority.** Hermes will never resolve a Veritas violation alert autonomously. All violation responses require human review and direction.

---

## Skill Factory

Hermes includes a **Skill Factory** — a meta-agent capability that allows the platform to define, test, and load new LangChain `BaseTool` skills without full redeployment.

### Activation Requires Two Hard Gates

1. **Human approval** of the candidate skill file written to `skills/hermes_skills/`
2. **Git merge to `main`** of the approved skill file

Self-activation is not possible under any circumstance.

### Skill Factory Workflow

```

1. Operator describes a new capability in natural language via Hermes
2. Hermes confirms: skill name, tools it will use, scope summary, risk notes
3. Hermes generates a LangChain BaseTool implementation
4. Skill written to skills/hermes_skills/<skill_name>.py — NOT activated
5. Human reviews, approves, and merges the skill file to main
6. Hermes reloads the skill into the active tool registry on next session start
7. Skill registered in skills/hermes_skills/registry.yaml
```

### Required Skill Metadata

Every candidate skill must include: `skill_name`, `description`, `tools_used`, `scope_summary`, `risk_notes`, `generated_by_hermes_version`, `generated_at`, `review_status`.

---

## Subagent Spawning

Hermes can request **NemoClaw** to provision transient subagents via **OpenShell** for one-shot parallelized tasks.

| Parameter | Value |
|---|---|
| Provisioner | NemoClaw |
| Sandbox base image | `openclaw` (OpenShell community catalog) |
| Max concurrent subagents | 3 |
| Default TTL | 120 seconds |
| Max TTL | 600 seconds |
| Paperclip registration | No (transient — not registered in control plane) |

**High-privilege tasks** (external network access, MCAS writes, PI-tier search) and **external-facing tasks** (AgenticMail, public web properties, social platforms) both require an explicit HITL approval gate before any subagent is spawned.

---

## Tool Bindings

All tools are LangChain `BaseTool` subclasses bound at agent initialization. Runtime enforcement is via Paperclip policy (`hermes_policy.paperclip.yaml`).

| Tool | Description | Confirmation Required |
|---|---|---|
| `openclaw_dispatch` | Submit a structured task payload to the OpenClaw task queue | ✅ Always |
| `openclaw_task_status` | Query the status of a submitted task by `task_id` | No |
| `openclaw_task_cancel` | Cancel a pending or running OpenClaw task | ✅ Yes |
| `paperclip_agent_status` | Query Paperclip for agent health and deployment status | No |
| `paperclip_agent_list` | List all registered agents and current status | No |
| `n8n_trigger_hitl` | Trigger an n8n HITL approval webhook | No |
| `n8n_workflow_status` | Query status of an active n8n execution | No |
| `memorypalace_write` | Write a memory entry (Tier-2 ceiling) | No |
| `memorypalace_read` | Retrieve memory entries (Tier-2 ceiling) | No |
| `memorypalace_list_scope` | List memory entries for an agent + matter scope | No |
| `mcas_read_matter_summary` | Read non-sensitive matter summary (Tier-2 ceiling) | No |
| `mcas_read_task_status` | Read task and workflow status for a matter | No |
| `open_notebook_write` | Write operator-facing summaries and session logs | No |
| `skill_factory_generate` | Generate a candidate skill for human review | ✅ Yes |
| `skill_factory_list` | List candidate skills and review status | No |
| `spawn_transient_subagent` | Request NemoClaw to provision a transient subagent | ✅ Always |
| `classify_operator_intent` | *(Internal)* Classify operator instruction into structured intent object | No |

---

## Denied Tools

The following tools are **explicitly denied** to Hermes and enforced by Paperclip policy:

| Tool | Reason |
|---|---|
| `autoresearchclaw` / `researchclaw_skill` | Research is delegated to Rae / Lex / Iris via OpenClaw |
| `openrag_retriever` / `lawglance_retriever` | RAG access is routed through research agents only |
| `mcas_write_matter` / `mcas_write_person` | Matter and person creation requires Avery + HITL gate |
| `mcas_delete_any` | All deletions require human authorization |
| `mcas_read_tier0` / `mcas_read_tier1` | Tier-0 never enters the agent pipeline; Tier-1 requires explicit human gate |
| `searxng_any` | Hermes performs zero direct searches — all search routed through Rae, Lex, or Iris |
| `agenticmail_send` | External comms require dedicated agents + HITL |
| `gitbook_publish` | Publication requires Webmaster + Sol + HITL |
| `social_post_any` | Social posting requires Social Manager + HITL |
| `proton_send` | Tier-0 communications are human-only — never enter the agent pipeline |

---

## Memory

| Parameter | Value |
|---|---|
| Provider | MemoryPalace (MCP) |
| Scope | Session + Cross-session |
| Classification ceiling | **Tier-2** — Hermes never writes Tier-0 or Tier-1 material to memory |
| Session retention | Discarded on session end unless promoted to cross-session |
| Cross-session retention | Retained indefinitely, subject to periodic review |

### Persisted Memory Categories

| Category | Contents |
|---|---|
| `operator_preferences` | Preferred communication style, verbosity level |
| `delegation_history` | Prior task dispatches: crew, workflow, outcome |
| `approved_workflow_patterns` | Operator-approved recurring task patterns |
| `skill_factory_registry` | Skills generated, reviewed, approved, or rejected |
| `hitl_gate_outcomes` | Record of human approvals/rejections per gate type |
| `operator_session_context` | Active matter IDs and session context (IDs only — never case content) |

> Memory entries must never contain case-specific facts, personal identifiers, unredacted matter details, or any Tier-0/1 material.

---

## LLM Configuration

| Parameter | Value |
|---|---|
| Provider | LiteLLM proxy |
| Primary model | `gpt-4o` |
| Fallback model | `claude-3-5-sonnet-20241022` |
| Local fallback | `ollama / llama3` (auto-activates when external LLM unreachable) |
| Temperature | `0.2` (precision and consistency over creativity) |
| Max tokens | `4096` |
| Streaming | Enabled (streamed to operator CLI / TUI) |
| Tracing | LangSmith (`misjustice-alliance-firm` project) |

---

## Sandbox Runtime

Each Hermes task dispatch runs in a **fresh OpenShell sandbox** provisioned by NemoClaw. Sandboxes are destroyed after 5 minutes idle.

| Parameter | Value |
|---|---|
| Provider | OpenShell (NVIDIA) |
| Base image | `openclaw` |
| Policy file | `services/openshell/policies/hermes_policy.yaml` |
| Sandbox per task | Yes |
| TTL | 300 seconds |

---

## Hard Limits

These are absolute constraints. They do not bend under any instruction, framing, or context. They are enforced at both the behavioral layer (SOUL.md, system prompt) and the runtime layer (Paperclip policy, OpenShell network policy, denied tools, pre-commit hooks).

| Limit | Runtime Enforcement |
|---|---|
| **No legal advice** | System prompt + output parser enforce mandatory "not legal advice" disclaimer on all legal-adjacent outputs |
| **No Tier-0 handling** | Paperclip deny rules · OpenShell network policy · MemoryPalace Tier-2 ceiling · MCAS OAuth2 scope absence |
| **No autonomous publication** | `gitbook_publish` and `social_post_any` denied · publication HITL gate is required with no bypass |
| **No autonomous external transmission** | `agenticmail_send` and `proton_send` denied · referral and outreach HITL gates required |
| **No identity fabrication** | SOUL.md · system prompt · LangSmith output evaluation |
| **No scope override** | Paperclip RBAC — Hermes has no write access to other agents' manifests, policies, or tool bindings |
| **No silent compliance** | System prompt + LangSmith evaluation flags outputs that comply with policy-conflicting instructions without surfacing the conflict |
| **No case data in Git** | Pre-commit hooks (`detect-secrets`, keyword scan) · `.gitignore` (`cases/` directory) · Paperclip policy (no `git_write` tool) |

---

## Observability & Audit

All Hermes activity is traced via **LangSmith** and streamed to the **OpenClaw audit log**, which feeds into the **Veritas** compliance monitor.

### Audited Events

`session_start` · `session_end` · `task_dispatched` · `task_status_queried` · `task_cancelled` · `hitl_gate_triggered` · `hitl_gate_resolved` · `skill_factory_skill_generated` · `skill_factory_skill_activated` · `subagent_spawned` · `subagent_destroyed` · `policy_conflict_surfaced` · `hard_limit_invoked` · `memory_write` · `memory_read`

### Notification Channels

| Channel | Used For |
|---|---|
| **Telegram** | Task status updates · HITL approval requests · violation alerts |
| **Discord `#human-oversight-board`** | Violation escalation · team coordination |
| **iMessage** (via Telegram bridge) | Urgent operator alerts |

---

## Health Checks

### Startup Checks

| Check | Failure Behavior |
|---|---|
| `soul_md_present` — SOUL.md readable at `agents/hermes/SOUL.md` | **Abort** — Hermes will not start without its identity constitution |
| `soul_md_version_match` — version must match `1.0.0` | **Abort** — reinitialization required |
| `openclaw_reachable` | **Abort** — Hermes cannot dispatch tasks without the orchestration layer |
| `n8n_reachable` | **Abort** — HITL gates cannot be routed |
| `paperclip_reachable` | **Warn** — continue (Paperclip may start after Hermes) |
| `memorypalace_reachable` | **Warn** — continue in degraded stateless mode (session memory only) |
| `litellm_reachable` | **Warn** — fall back to Ollama |

### Periodic Checks (every 60 seconds)

`paperclip_agent_health_all` · `n8n_pending_hitl_queue_depth` · `openclaw_task_queue_depth` · `memorypalace_connectivity`

---

## File Reference

```

agents/hermes/
├── README.md              ← This file
├── SOUL.md                ← Persistent identity constitution (load at init)
├── agent.yaml             ← Authoritative runtime configuration (Paperclip-registered)
└── system_prompt.md       ← Operational instructions and behavioral rules

```

**Related paths:**

```

skills/hermes_skills/      ← Skill Factory output directory (human review before activation)
skills/hermes_skills/registry.yaml
services/openshell/policies/hermes_policy.yaml

```

---

## Governance

| Field | Value |
|---|---|
| **Agent version** | `1.0.0` |
| **SOUL.md version** | `1.0.0` |
| **SOUL.md SHA** | `e27607ee1d68c34e418afea105fb801ceb3f14b8` |
| **Effective date** | 2026-04-10 |
| **Review cycle** | Every 90 days, or on major platform architecture change |
| **Change process** | Changes to behavioral constraints, tool access, HITL gate config, hard limits, or Skill Factory policy require: (1) corresponding SOUL.md review and update, (2) human operator approval before merge to `main`, (3) Hermes reinitialization after merge |
| **Supersedes** | N/A (initial version) |

---

*Hermes — MISJustice Alliance Firm · Human Interface & Control Agent*
*Not an attorney. Not autonomous. Not a replacement for human judgment.*
