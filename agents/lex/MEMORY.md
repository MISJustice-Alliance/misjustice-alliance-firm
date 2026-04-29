# Lex Agent — Memory Architecture

> **Agent:** Lex — Lead Counsel / Senior Analyst
> **Version:** 0.2.0
> **Document version:** 1.0.0
> **Effective date:** 2026-04-16
> **Maintainer:** MISJustice Alliance Platform Team

This document defines the complete memory architecture for the Lex agent: what Lex remembers, how it is stored, what is explicitly forbidden from memory, lifecycle rules, and operational procedures.

---

## Table of Contents

1. [Memory Design Principles](#1-memory-design-principles)
2. [Memory Provider](#2-memory-provider)
3. [Memory Tiers and Scope](#3-memory-tiers-and-scope)
4. [Permitted Memory Categories](#4-permitted-memory-categories)
5. [Prohibited Memory Content](#5-prohibited-memory-content)
6. [Memory Lifecycle](#6-memory-lifecycle)
7. [Read Behavior](#7-read-behavior)
8. [Write Behavior](#8-write-behavior)
9. [Degraded Mode — MemoryPalace Unavailable](#9-degraded-mode--memorypalace-unavailable)
10. [Retention, Review, and Purge](#10-retention-review-and-purge)
11. [Security and Audit](#11-security-and-audit)

---

## 1. Memory Design Principles

### 1.1 Memory Serves Analysis Context, Not Case Storage

Lex memory exists to maintain analysis context within a single session — remembering the task scope, data sources queried, and partial findings. It is **not** a case data store. Case content, matter facts, and legal work product live exclusively in MCAS. Lex references matters by ID only.

### 1.2 Minimum Necessary Retention

Lex stores the minimum information needed to produce coherent analysis within a session. If information is available on-demand from MCAS or MCP, it is not duplicated in memory.

### 1.3 Classification Ceiling is Tier-2

Lex's memory classification ceiling is **Tier-2**. No Tier-0 or Tier-1 content may ever be written to MemoryPalace under any circumstances.

### 1.4 Session Memory is Ephemeral

All session-scoped memory is discarded at session end. Lex does not persist analysis outputs, findings, or conclusions across sessions.

### 1.5 Transparency

Lex can produce a complete list of its current memory entries on operator request via `memorypalace_list_scope`.

---

## 2. Memory Provider

| Property | Value |
|---|---|
| **Provider** | MemoryPalace MCP |
| **MCP URL** | `$MEMORYPALACE_MCP_URL` (injected at runtime) |
| **Agent scope** | `lex` |
| **Classification ceiling** | `tier2` |
| **Session storage** | In-process LangChain `ConversationBufferWindowMemory` (k=20 turns) |
| **Cross-session storage** | None — Lex does not write cross-session memory |
| **Unavailability fallback** | Stateless mode — session buffer only, no persistence |

---

## 3. Memory Tiers and Scope

### Session Memory

Active only for the duration of a single task session. Backed by LangChain's `ConversationBufferWindowMemory` in-process.

| Property | Value |
|---|---|
| **Scope** | Single session |
| **Backed by** | In-process LangChain buffer (k=20 turns) |
| **Persistence** | None — lost on session end |
| **Content** | Task scope, data sources queried, partial findings, working context |

Lex does **not** use cross-session memory. Each analysis task is independent.

---

## 4. Permitted Memory Categories

Lex is authorized to use exactly **one** memory category during a session:

| Category | Scope | Description |
|---|---|---|
| `analysis_context` | Session | Working context for the current analysis: task scope, jurisdictions, data sources queried, intermediate findings |

---

## 5. Prohibited Memory Content

The following content types are **absolutely prohibited** from MemoryPalace writes under any circumstances:

### 5.1 Case Content and Matter Facts
- Complainant statements, allegations, incident descriptions
- Evidence summaries, witness accounts, document contents
- Legal strategy notes, case theory, litigation tactics
- Court filing drafts, correspondence drafts, legal opinions

### 5.2 Personal Identifiers (PII)
- Full names of complainants, respondents, witnesses, or parties
- Social Security Numbers, national ID numbers
- Date of birth, address, phone number, email address of parties
- Immigration status, protected class information
- Medical or financial information of any individual

### 5.3 Classified Content
- Tier-0: Attorney-client privileged communications, sealed court records
- Tier-1: Sensitive PII, protected records, unredacted case documents
- Any content carrying a classification marking above Tier-2

### 5.4 Analysis Outputs
- Completed reports, findings, or conclusions
- Citations lists or research memos
- Any work product that belongs in MCAS

---

## 6. Memory Lifecycle

### Session Start

1. Lex instantiates `ConversationBufferWindowMemory` (k=20) for in-session turn buffer.
2. If MemoryPalace is reachable, Lex loads any prior `analysis_context` for the active matter (session-scoped only).
3. A `session_started` audit event is emitted with `session_id`.

### During Session

- The LangChain turn buffer tracks the rolling 20-turn conversation window.
- Lex updates `analysis_context` after each data gathering step.
- Lex never writes completed analysis outputs to memory.

### Session End

1. All session-scoped entries are discarded.
2. A `session_ended` audit event is emitted.
3. The LangChain turn buffer is cleared from memory.

---

## 7. Read Behavior

### Session Startup Autoload

On session start, Lex loads from MemoryPalace into the session context:

```
## Your Analysis Context

### Active Task
{task scope, matter_id, task_type}

### Data Sources Queried
{list of sources already queried in this session}

### Intermediate Findings
{partial findings from prior turns}
```

### On-Demand Reads

Lex does not perform on-demand memory reads outside of session startup. All required data is fetched from MCAS or MCP tools.

---

## 8. Write Behavior

### Write Triggers

Lex writes to MemoryPalace only on explicit triggering events:

| Trigger | Category Written | Key |
|---|---|---|
| Data gathering step completed | `analysis_context` | `analysis/{task_id}/sources` |
| Intermediate findings produced | `analysis_context` | `analysis/{task_id}/findings` |

### Write Pipeline

Every write attempt passes through the guardrail chain:

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
    │ Fail → BLOCK + error
    │ Pass
    ▼
MemoryPalace write committed
    │
    ▼
Audit log event emitted
```

---

## 9. Degraded Mode — MemoryPalace Unavailable

When MemoryPalace is unreachable at session start or becomes unavailable mid-session:

1. Lex enters **stateless mode**: only the in-process LangChain turn buffer (k=20) is available.
2. Lex continues operating without memory persistence.
3. All `memorypalace_write` and `memorypalace_read` tool calls return graceful errors.
4. Metric emitted: `lex_memory_unavailable_total`.

---

## 10. Retention, Review, and Purge

### Retention Policy

| Category | Retention | Pruning Rule |
|---|---|---|
| `analysis_context` | Session end | Auto-purged on session close |

### Operator-Initiated Purge

Not applicable — Lex does not persist cross-session memory.

---

## 11. Security and Audit

### Access Control

- Lex accesses MemoryPalace using a scoped API key authorized only for the `lex` agent scope.
- No other agent may read or write to the `lex` scope without explicit Paperclip authorization.

### Write Audit Trail

Every MemoryPalace write generates:
- A LangSmith trace event tagged `event_type=memory_write`
- A Loki log entry with `agent=lex`, `session_id`, `category`, `key`
- A Prometheus metric increment: `lex_memory_writes_total{category, scope}`

Every blocked write generates:
- A LangSmith trace event tagged `event_type=memory_write_rejected`
- A Prometheus metric increment: `lex_memory_write_rejected_total{rejection_reason}`
- Veritas escalation if the rejection reason is `tier1_content` or `tier0_content`

---

*This document is maintained alongside `agent.yaml`, `SOUL.md`, `POLICY.md`, `config.yaml`, and `GUARDRAILS.yaml`.*
