# Hermes Agent — Memory Architecture

> **Agent:** Hermes — Human Interface & Control Agent
> **Version:** 1.0.0
> **Document version:** 1.0.0
> **Effective date:** 2026-04-16
> **Maintainer:** MISJustice Alliance Platform Team

This document defines the complete memory architecture for the Hermes agent: what Hermes remembers, how it is stored, what is explicitly forbidden from memory, the full schema for each permitted category, lifecycle rules, and operational procedures.

---

## Table of Contents

1. [Memory Design Principles](#1-memory-design-principles)
2. [Memory Provider](#2-memory-provider)
3. [Memory Tiers and Scope](#3-memory-tiers-and-scope)
4. [Permitted Memory Categories](#4-permitted-memory-categories)
5. [Prohibited Memory Content](#5-prohibited-memory-content)
6. [Category Schemas](#6-category-schemas)
7. [Memory Lifecycle](#7-memory-lifecycle)
8. [Read Behavior](#8-read-behavior)
9. [Write Behavior](#9-write-behavior)
10. [Degraded Mode — MemoryPalace Unavailable](#10-degraded-mode--memorypalace-unavailable)
11. [Retention, Review, and Purge](#11-retention-review-and-purge)
12. [Security and Audit](#12-security-and-audit)

---

## 1. Memory Design Principles

### 1.1 Memory Serves Operator Continuity, Not Case Storage

Hermes memory exists to make the operator's experience continuous and efficient across sessions — remembering preferences, past delegation patterns, and pending HITL gate states. It is **not** a case data store. Case content, matter facts, personal identifiers, and all legal work product live exclusively in MCAS. Hermes references matters by ID only.

### 1.2 Minimum Necessary Retention

Hermes stores the minimum information needed to provide continuity. If a piece of information is available on-demand from MCAS or OpenClaw, it is not duplicated in memory — a reference (matter ID, task ID) is stored instead of content.

### 1.3 Classification Ceiling is Tier-2

Hermes's memory classification ceiling is **Tier-2**. No Tier-0 (privileged, sealed) or Tier-1 (sensitive PII, protected records) content may ever be written to MemoryPalace under any circumstances. This ceiling is enforced by:
- `GUARDRAILS.yaml` (G-MEM-001, G-MEM-002, G-MEM-003)
- MemoryPalace MCP schema validation
- Paperclip policy (`hermes_policy.paperclip.yaml`)
- Veritas nightly audit of all memory write events

### 1.4 Session Memory is Ephemeral by Default

All session-scoped memory is discarded at session end unless the operator explicitly promotes an entry to cross-session. Hermes does not silently persist session context.

### 1.5 Transparency

Hermes can always produce a complete list of its current cross-session memory entries on operator request via `memorypalace_list_scope`. The operator may request deletion of any entry at any time.

---

## 2. Memory Provider

| Property | Value |
|---|---|
| **Provider** | MemoryPalace MCP |
| **MCP URL** | `$MEMORYPALACE_MCP_URL` (injected at runtime) |
| **Agent scope** | `hermes` |
| **Classification ceiling** | `tier2` |
| **Session storage** | In-process LangChain `ConversationBufferWindowMemory` (k=20 turns) |
| **Cross-session storage** | MemoryPalace vector + key-value store |
| **Unavailability fallback** | Stateless mode — session buffer only, no persistence |

All MemoryPalace operations are logged to LangSmith and Loki under the `hermes` agent scope. Veritas audits all write events nightly.

---

## 3. Memory Tiers and Scope

### Session Memory

Active only for the duration of a single operator session. Backed by LangChain's `ConversationBufferWindowMemory` in-process — no external storage required.

| Property | Value |
|---|---|
| **Scope** | Single session |
| **Backed by** | In-process LangChain buffer (k=20 turns) |
| **Persistence** | None — lost on session end unless promoted |
| **Promotion** | Operator instruction only: `"remember this for future sessions"` |
| **MemoryPalace required** | No |
| **Content** | Active matter IDs, current task IDs, session instructions, working context |

Session memory is automatically loaded with the previous session's promoted cross-session entries at startup (see §8).

### Cross-Session Memory

Persisted across sessions via MemoryPalace. Loaded at session startup. Retained indefinitely subject to the 90-day review cycle.

| Property | Value |
|---|---|
| **Scope** | Persistent across all sessions |
| **Backed by** | MemoryPalace MCP (vector + key-value) |
| **Persistence** | Indefinite, subject to review |
| **Promotion from session** | Operator instruction required |
| **MemoryPalace required** | Yes (degrades to stateless if unavailable) |
| **Content** | Operator preferences, delegation history, approved patterns, skill registry, HITL outcomes |

---

## 4. Permitted Memory Categories

Hermes is authorized to write to exactly **six** memory categories. All other categories are blocked by G-MEM-001.

| Category | Scope | Description |
|---|---|---|
| `operator_preferences` | Cross-session | Communication style, verbosity, output format preferences |
| `delegation_history` | Cross-session | Record of past task dispatches: crew, workflow, outcome |
| `approved_workflow_patterns` | Cross-session | Operator-approved recurring delegation patterns |
| `skill_factory_registry` | Cross-session | Skills generated, reviewed, approved, or rejected |
| `hitl_gate_outcomes` | Cross-session | Record of HITL gate approvals, rejections, and timeouts |
| `operator_session_context` | Session | Active matter IDs, task IDs, and working context for current session |

---

## 5. Prohibited Memory Content

The following content types are **absolutely prohibited** from MemoryPalace writes under any circumstances. Violations trigger a block by G-MEM-002/003, a critical audit event, and Veritas escalation.

### 5.1 Case Content and Matter Facts
- Complainant statements, allegations, incident descriptions
- Evidence summaries, witness accounts, document contents
- Legal strategy notes, case theory, litigation tactics
- Court filing drafts, correspondence drafts, legal opinions
- Any content that could identify a matter participant

### 5.2 Personal Identifiers (PII)
- Full names of complainants, respondents, witnesses, or parties
- Social Security Numbers, national ID numbers
- Date of birth, address, phone number, email address of parties
- Immigration status, protected class information
- Medical or financial information of any individual

### 5.3 Classified Content
- Tier-0: Attorney-client privileged communications, sealed court records, protected materials
- Tier-1: Sensitive PII, protected records, unredacted case documents
- Any content carrying a classification marking above Tier-2

### 5.4 Credentials and Secrets
- API keys, tokens, passwords, webhook secrets
- Any value that matches a secret detection pattern

### 5.5 Operational Security
- Internal system architecture details beyond what is already public in this repository
- Agent behavioral bypass techniques discovered through testing
- Guardrail trigger rates or pattern specifics that could inform evasion

---

## 6. Category Schemas

Each MemoryPalace write must conform to the schema for its category. The MemoryPalace MCP enforces schema validation at write time.

### 6.1 `operator_preferences`

```yaml
schema:
  key: "preferences/{preference_name}"   # e.g. preferences/verbosity
  fields:
    preference_name:                      # required — string, snake_case
      type: string
      required: true
      example: "verbosity"
    value:                                # required — the preference value
      type: string | integer | boolean
      required: true
      example: "concise"
    set_at:                               # required — ISO 8601 timestamp
      type: datetime
      required: true
    set_by:                               # required — always "operator"
      type: string
      enum: [operator]
      required: true
    notes:                                # optional — free text, max 200 chars
      type: string
      max_length: 200
      prohibited_content: [pii, case_data, credentials]
permitted_values:
  verbosity: ["concise", "detailed", "technical"]
  output_format: ["plain", "markdown", "structured"]
  confirmation_style: ["brief", "full"]
  notification_channel: ["cli", "telegram", "both"]
  session_autoload: [true, false]
```

### 6.2 `delegation_history`

```yaml
schema:
  key: "delegation/{task_id}"            # e.g. delegation/TASK-00142
  fields:
    task_id:                              # required — OpenClaw task ID
      type: string
      pattern: "^TASK-\\d+$"
      required: true
    matter_id:                            # required — MCAS reference ID only
      type: string
      pattern: "^MCAS-\\d+$"
      required: true
      note: ID reference only. No matter content stored here.
    crew:                                 # required
      type: string
      required: true
      example: "LegalResearchCrew"
    workflow:                             # required
      type: string
      required: true
      example: "statutory_research"
    dispatched_at:                        # required — ISO 8601 timestamp
      type: datetime
      required: true
    completed_at:                         # optional — set when task resolves
      type: datetime
      required: false
    final_status:                         # optional
      type: string
      enum: [complete, failed, cancelled, pending]
      required: false
    operator_notes:                       # optional — operator-provided context
      type: string
      max_length: 500
      prohibited_content: [pii, case_data, legal_advice, credentials]
retention:
  max_entries: 500                        # Oldest entries pruned beyond this limit
  prune_completed_after_days: 365
```

### 6.3 `approved_workflow_patterns`

```yaml
schema:
  key: "patterns/{pattern_name}"         # e.g. patterns/standard_intake_flow
  fields:
    pattern_name:                         # required — snake_case
      type: string
      required: true
    description:                          # required — what this pattern does
      type: string
      max_length: 500
      required: true
      prohibited_content: [pii, case_data, credentials]
    crew:                                 # required
      type: string
      required: true
    workflow:                             # required
      type: string
      required: true
    approved_by:                          # required — always "operator"
      type: string
      enum: [operator]
      required: true
    approved_at:                          # required — ISO 8601 timestamp
      type: datetime
      required: true
    hitl_gates_required:                  # required — list of gate IDs
      type: list[string]
      required: true
    use_count:                            # optional — incremented on each use
      type: integer
      default: 0
    last_used_at:                         # optional
      type: datetime
      required: false
```

### 6.4 `skill_factory_registry`

```yaml
schema:
  key: "skills/{skill_name}"             # e.g. skills/bulk_status_checker
  fields:
    skill_name:                           # required
      type: string
      required: true
    description:                          # required
      type: string
      max_length: 1000
      required: true
    file_path:                            # required — path in skills/hermes_skills/
      type: string
      pattern: "^skills/hermes_skills/.+\.py$"
      required: true
    tools_used:                           # required — list of tool names
      type: list[string]
      required: true
    review_status:                        # required
      type: string
      enum: [pending, approved, rejected, active]
      required: true
    generated_by_hermes_version:          # required
      type: string
      required: true
    generated_at:                         # required — ISO 8601 timestamp
      type: datetime
      required: true
    reviewed_at:                          # optional — set when operator reviews
      type: datetime
      required: false
    git_merge_sha:                        # optional — set after merge to main
      type: string
      required: false
    risk_notes:                           # required at generation time
      type: string
      max_length: 1000
      required: true
      prohibited_content: [pii, case_data, credentials]
    activated_at:                         # optional — set when status → active
      type: datetime
      required: false
```

### 6.5 `hitl_gate_outcomes`

```yaml
schema:
  key: "hitl/{gate_id}/{event_id}"       # e.g. hitl/intake_approval/EVT-00034
  fields:
    event_id:                             # required — unique event identifier
      type: string
      required: true
    gate_id:                              # required
      type: string
      enum:
        - task_dispatch_confirmation
        - subagent_spawn_authorization
        - skill_factory_activation
        - intake_approval
        - research_scope_authorization
        - referral_approval
        - publication_approval
        - social_campaign_approval
        - violation_escalation
        - deadline_escalation
      required: true
    triggered_at:                         # required — ISO 8601 timestamp
      type: datetime
      required: true
    resolved_at:                          # optional — set on resolution
      type: datetime
      required: false
    resolution:                           # optional
      type: string
      enum: [approved, rejected, revision_requested, timed_out]
      required: false
    task_id:                              # optional — associated OpenClaw task
      type: string
      pattern: "^TASK-\\d+$"
      required: false
    matter_id:                            # optional — MCAS reference ID only
      type: string
      pattern: "^MCAS-\\d+$"
      required: false
    time_to_resolution_seconds:           # optional — computed on resolution
      type: integer
      required: false
retention:
  max_entries_per_gate: 200
  prune_resolved_after_days: 365
```

### 6.6 `operator_session_context`

```yaml
schema:
  key: "session/{session_id}/{context_key}"
  fields:
    session_id:                           # required — UUID
      type: string
      format: uuid
      required: true
    context_key:                          # required — what this context item is
      type: string
      required: true
      example: "active_matter_id"
    value:                                # required
      type: string | list[string]
      required: true
      note: >-
        IDs and references only. No content. Permitted values:
        MCAS matter IDs, OpenClaw task IDs, crew names, workflow names,
        gate IDs. Raw case data, PII, and legal content are prohibited.
    recorded_at:                          # required — ISO 8601 timestamp
      type: datetime
      required: true
retention:
  scope: session                          # Purged at session end unless promoted
  promotion: operator_instruction_required
  promoted_to_category: operator_preferences | delegation_history  # depending on content
```

---

## 7. Memory Lifecycle

### Session Start

1. Hermes instantiates `ConversationBufferWindowMemory` (k=20) for in-session turn buffer.
2. If MemoryPalace is reachable, Hermes loads the following cross-session categories into the session context:
   - `operator_preferences` — all entries
   - `hitl_gate_outcomes` — pending (unresolved) gates only
   - `skill_factory_registry` — entries with `review_status: active` only
3. A `session_started` audit event is emitted with `session_id`.
4. If MemoryPalace is unreachable, Hermes enters stateless mode (see §10).

### During Session

- The LangChain turn buffer tracks the rolling 20-turn conversation window.
- Hermes writes to `operator_session_context` whenever the operator references a matter ID, task ID, or active workflow, so context survives a session buffer overflow.
- Hermes writes to `delegation_history` after every confirmed OpenClaw dispatch.
- Hermes writes to `hitl_gate_outcomes` after every gate trigger and resolution.
- Hermes writes to `skill_factory_registry` after every Skill Factory generation.
- Hermes never writes to memory autonomously without an triggering event (dispatch, gate, generation) or explicit operator instruction.

### Session End

1. Session-scoped `operator_session_context` entries are discarded unless the operator issued a promotion instruction during the session.
2. A `session_ended` audit event is emitted with entry counts per category.
3. The LangChain turn buffer is cleared from memory.

### Explicit Promotion

The operator may at any time instruct Hermes to promote a session memory entry to cross-session:

```
Operator: "Remember my preference for concise output in future sessions."
Hermes:   → writes operator_preferences.verbosity = "concise" to MemoryPalace
          → confirms: "Saved. I'll default to concise output in future sessions."
```

Promotion always requires an explicit operator instruction. Hermes never promotes session context silently.

---

## 8. Read Behavior

### Session Startup Autoload

On session start, the following is loaded from MemoryPalace into the LangChain system prompt prefix (injected before the first operator turn):

```
## Your Memory Context

### Operator Preferences
{operator_preferences entries — key: value list}

### Pending HITL Gates
{hitl_gate_outcomes entries where resolution is null — gate_id, triggered_at, task_id}

### Active Skills
{skill_factory_registry entries where review_status = "active" — skill_name, description}
```

This context is injected once at startup and does not persist in the rolling turn buffer, conserving context window space.

### On-Demand Reads

Hermes uses `memorypalace_read` during a session in the following cases:

| Trigger | Category | Retrieval Type |
|---|---|---|
| Operator asks about a past task | `delegation_history` | Key lookup by `TASK-{id}` or semantic search by workflow |
| Operator asks about a HITL gate decision | `hitl_gate_outcomes` | Key lookup by `gate_id + event_id` |
| Operator asks about a skill | `skill_factory_registry` | Key lookup by `skill_name` |
| Operator asks about their preferences | `operator_preferences` | Full category list |

### Semantic Retrieval

For delegation history and HITL outcomes, Hermes may use MemoryPalace semantic search when an exact key is not available (e.g., `"what legal research tasks did I dispatch last month?"`). Semantic retrieval returns a ranked list of matching entries; Hermes surfaces only the top-3 most relevant to avoid context window inflation.

### Classification Check on Read

All content returned by MemoryPalace reads passes through `G-MEM-003` (classified content check) and `G-TOOL-POST-001` (tool output classification scan) before being incorporated into the agent reasoning context.

---

## 9. Write Behavior

### Write Triggers

Hermes writes to MemoryPalace only on explicit triggering events. It never performs speculative or background writes.

| Trigger | Category Written | Key |
|---|---|---|
| Confirmed OpenClaw dispatch | `delegation_history` | `delegation/TASK-{id}` |
| HITL gate triggered | `hitl_gate_outcomes` | `hitl/{gate_id}/{event_id}` |
| HITL gate resolved | `hitl_gate_outcomes` | Update existing key |
| Skill Factory generation completed | `skill_factory_registry` | `skills/{skill_name}` |
| Skill review status changes | `skill_factory_registry` | Update existing key |
| Operator issues preference instruction | `operator_preferences` | `preferences/{name}` |
| Operator approves a workflow pattern | `approved_workflow_patterns` | `patterns/{name}` |
| Operator references matter/task in session | `operator_session_context` | `session/{session_id}/{key}` |

### Write Pipeline

Every write attempt passes through the following guardrail chain before reaching MemoryPalace:

```
Write Request
    │
    ▼
G-MEM-001: Category permitted?
    │ No  → BLOCK
    │ Yes
    ▼
G-MEM-002: PII present?
    │ Yes → BLOCK + audit
    │ No
    ▼
G-MEM-003: Classified content (Tier-1/Tier-0)?
    │ Yes → BLOCK + escalate to Veritas
    │ No
    ▼
MemoryPalace MCP schema validation
    │ Fail → BLOCK + error to operator
    │ Pass
    ▼
MemoryPalace write committed
    │
    ▼
G-TOOL-POST-002: Write confirmation audit log
    │
    ▼
LangSmith + Loki event emitted
```

---

## 10. Degraded Mode — MemoryPalace Unavailable

When MemoryPalace is unreachable at session start or becomes unavailable mid-session:

1. Hermes enters **stateless mode**: only the in-process LangChain turn buffer (k=20) is available.
2. The operator is notified:
   ```
   ⚠️ NOTICE — Memory Unavailable
   MemoryPalace is currently unreachable. Hermes is operating in stateless
   mode — no operator preferences, delegation history, or HITL gate state
   will be loaded or persisted for this session. All functionality except
   cross-session memory is available. MemoryPalace will be retried every
   60 seconds.
   ```
3. All `memorypalace_write` and `memorypalace_read` tool calls return a graceful error; Hermes does not retry aggressively (rate: once per 60s).
4. When MemoryPalace comes back online during the session, Hermes attempts to flush any buffered write events from the session (delegation history, HITL outcomes, skill registry updates) that occurred while degraded.
5. Metric emitted: `hermes_memory_unavailable_total` (triggers warning alert at >0, critical at >3 in 1h).

---

## 11. Retention, Review, and Purge

### Retention Policy

| Category | Retention | Pruning Rule |
|---|---|---|
| `operator_preferences` | Indefinite | Manual operator deletion only |
| `delegation_history` | 365 days after completion; max 500 entries | Oldest completed entries pruned first |
| `approved_workflow_patterns` | Indefinite while `use_count > 0`; operator-deletable | Manual or via 90-day review |
| `skill_factory_registry` | Indefinite for `active`; 90 days for `rejected` | Rejected skills purged after 90 days |
| `hitl_gate_outcomes` | 365 days after resolution; max 200/gate | Oldest resolved entries pruned first |
| `operator_session_context` | Session end (unless promoted) | Auto-purged on session close |

### 90-Day Review Cycle

As part of the platform's 90-day SOUL.md and agent configuration review cycle, the following memory hygiene tasks are performed:

1. **Delegation history audit** — confirm no case content has accumulated in `operator_notes` fields.
2. **Preference review** — confirm stored preferences still reflect operator intent.
3. **Workflow pattern review** — patterns with `use_count = 0` for 90+ days are flagged for deletion.
4. **Skill registry audit** — rejected skills older than 90 days are purged; active skills are reviewed against current `tools.yaml`.
5. **HITL outcome audit** — cross-reference resolved gates with LangSmith traces for completeness.

The 90-day review is performed by the platform team with Veritas-generated summary reports.

### Operator-Initiated Purge

The operator may request deletion of any memory entry at any time:

```
Operator: "Delete all my delegation history."
Hermes:   → confirms action + count of entries to be deleted
          → requests explicit operator confirmation
          → issues memorypalace_write delete operations on confirmation
          → logs audit event: memory_purge_requested_by_operator
```

Hermes always requests explicit confirmation before bulk-deleting memory entries.

---

## 12. Security and Audit

### Access Control

- Hermes accesses MemoryPalace using a scoped API key (`MEMORYPALACE_API_KEY`) authorized only for the `hermes` agent scope.
- No other agent may read or write to the `hermes` scope without explicit Paperclip authorization.
- MemoryPalace enforces scope isolation at the API level.

### Write Audit Trail

Every MemoryPalace write generates:
- A LangSmith trace event tagged `event_type=memory_write`
- A Loki log entry with `agent=hermes`, `session_id`, `category`, `key`
- A Prometheus metric increment: `hermes_memory_writes_total{category, scope}`

Every blocked write generates:
- A LangSmith trace event tagged `event_type=memory_write_rejected`
- A Prometheus metric increment: `hermes_memory_write_rejected_total{rejection_reason}`
- Veritas escalation if the rejection reason is `tier1_content` or `tier0_content`

### Veritas Nightly Audit

Veritas reviews all Hermes memory write events nightly against this document's prohibited content list. Any anomaly — unexpected category, schema violation bypassed, pattern suggestive of case data — generates a compliance finding and is surfaced via the `violation_escalation` HITL gate.

### Pre-Commit Hook

The repository's pre-commit hooks scan for case-specific keywords (`complainant`, `MCAS-`, `privileged`, `attorney-client`) in any file modified under `agents/hermes/`. This prevents accidentally committing memory snapshot files, debug exports, or session logs containing case content.

---

*This document is maintained alongside `agent.yaml`, `SOUL.md`, `POLICY.md`, `config.yaml`, and `GUARDRAILS.yaml`. Any change to permitted memory categories, schemas, retention rules, or classification ceilings requires a corresponding update here and a SOUL.md review cycle if the change affects behavioral constraints.*
