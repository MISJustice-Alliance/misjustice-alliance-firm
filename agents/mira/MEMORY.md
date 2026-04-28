# Mira Agent — Memory Architecture

> **Agent:** Mira — Legal Researcher / Telephony & Messaging Specialist
> **Version:** 0.2.0
> **Document version:** 1.0.0
> **Effective date:** 2026-04-16
> **Maintainer:** MISJustice Alliance Platform Team

This document defines the complete memory architecture for the Mira agent: what Mira remembers, how it is stored, what is explicitly forbidden from memory, lifecycle rules, and operational procedures.

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
10. [Degraded Mode](#10-degraded-mode)
11. [Retention, Review, and Purge](#11-retention-review-and-purge)
12. [Security and Audit](#12-security-and-audit)

---

## 1. Memory Design Principles

### 1.1 Memory Serves Research Context and Communication Compliance

Mira memory exists to:
- Maintain analysis context within a research session
- Persist consent and opt-out records across sessions
- Store operator preferences for communication style

Case content and legal work product live exclusively in MCAS.

### 1.2 Minimum Necessary Retention

Mira stores the minimum information needed for compliance and continuity.

### 1.3 Classification Ceiling is Tier-2

No Tier-0 or Tier-1 content may ever be written to MemoryPalace.

### 1.4 Consent Records Are Immutable

Once written, consent and opt-out records cannot be modified or deleted without HOB approval.

---

## 2. Memory Provider

| Property | Value |
|---|---|
| **Provider** | MemoryPalace MCP |
| **MCP URL** | `$MEMORYPALACE_MCP_URL` |
| **Agent scope** | `mira` |
| **Classification ceiling** | `tier2` |
| **Session storage** | In-process LangChain `ConversationBufferWindowMemory` (k=20 turns) |
| **Cross-session storage** | MemoryPalace vector + key-value store |
| **Unavailability fallback** | Stateless mode |

---

## 3. Memory Tiers and Scope

### Session Memory

| Property | Value |
|---|---|
| **Scope** | Single session |
| **Backed by** | In-process LangChain buffer (k=20 turns) |
| **Persistence** | None — lost on session end |
| **Content** | Task scope, research queries, partial findings, message draft context |

### Cross-Session Memory

| Property | Value |
|---|---|
| **Scope** | Persistent across all sessions |
| **Backed by** | MemoryPalace MCP |
| **Persistence** | Indefinite, subject to review |
| **Content** | Consent registry, opt-out registry, operator preferences |

---

## 4. Permitted Memory Categories

Mira is authorized to write to exactly **four** memory categories:

| Category | Scope | Description |
|---|---|---|
| `analysis_context` | Session | Working context for research tasks |
| `consent_registry` | Cross-session | Documented consent statuses per contact |
| `opt_out_registry` | Cross-session | Do-not-contact records |
| `operator_preferences` | Cross-session | Communication style preferences |

---

## 5. Prohibited Memory Content

### 5.1 Case Content and Matter Facts
- Complainant statements, allegations, incident descriptions
- Evidence summaries, witness accounts, document contents
- Legal strategy notes, case theory

### 5.2 Personal Identifiers (PII)
- Full names, SSNs, DOBs, addresses, phone numbers, emails
- Immigration status, protected class information
- Medical or financial information

### 5.3 Classified Content
- Tier-0 and Tier-1 content of any kind

### 5.4 Message Bodies
- Completed message texts, correspondence drafts
- Any content that belongs in MCAS or the messaging gateway audit log

---

## 6. Category Schemas

### 6.1 `analysis_context`

```yaml
schema:
  key: "analysis/{task_id}/{context_key}"
  fields:
    task_id:
      type: string
      required: true
    context_key:
      type: string
      required: true
    value:
      type: string | list[string]
      required: true
    recorded_at:
      type: datetime
      required: true
retention:
  scope: session
```

### 6.2 `consent_registry`

```yaml
schema:
  key: "consent/{contact_identifier}"
  fields:
    contact_identifier:
      type: string
      required: true
      note: Hashed or tokenized — never raw PII
    consent_basis:
      type: string
      enum: [opt_in, prior_relationship, staff_approved]
      required: true
    consent_documented_at:
      type: datetime
      required: true
    approved_by:
      type: string
      required: true
    matter_id:
      type: string
      required: false
      pattern: "^MCAS-[0-9]{4,}$"
retention:
  scope: cross_session
  indefinite: true
  immutable: true
```

### 6.3 `opt_out_registry`

```yaml
schema:
  key: "optout/{contact_identifier}"
  fields:
    contact_identifier:
      type: string
      required: true
      note: Hashed or tokenized
    opted_out_at:
      type: datetime
      required: true
    channel:
      type: string
      enum: [sms, email, phone, all]
      required: true
    matter_id:
      type: string
      required: false
retention:
  scope: cross_session
  indefinite: true
  immutable: true
```

### 6.4 `operator_preferences`

```yaml
schema:
  key: "preferences/{preference_name}"
  fields:
    preference_name:
      type: string
      required: true
    value:
      type: string | integer | boolean
      required: true
    set_at:
      type: datetime
      required: true
    set_by:
      type: string
      enum: [operator]
      required: true
permitted_values:
  verbosity: ["concise", "detailed"]
  confirmation_style: ["brief", "full"]
  default_channel: ["sms", "email", "secure_messaging"]
```

---

## 7. Memory Lifecycle

### Session Start

1. Instantiate `ConversationBufferWindowMemory` (k=20).
2. If MemoryPalace is reachable, load:
   - `operator_preferences`
   - `consent_registry` (for active matter contacts only)
   - `opt_out_registry` (for active matter contacts only)
3. Emit `session_started` audit event.

### During Session

- Update `analysis_context` during research tasks.
- Check `consent_registry` and `opt_out_registry` before drafting messages.
- Write to `consent_registry` when new consent is documented.
- Write to `opt_out_registry` when opt-out is received.

### Session End

1. Discard `analysis_context`.
2. Emit `session_ended` audit event.

---

## 8. Read Behavior

### Session Startup Autoload

```
## Your Memory Context

### Operator Preferences
{operator_preferences entries}

### Active Consent Records
{consent_registry entries for active matter}

### Active Opt-Out Records
{opt_out_registry entries for active matter}
```

### On-Demand Reads

| Trigger | Category | Retrieval Type |
|---|---|---|
| Drafting outbound message | `consent_registry`, `opt_out_registry` | Key lookup by contact hash |
| Operator asks about preferences | `operator_preferences` | Full category list |

---

## 9. Write Behavior

### Write Triggers

| Trigger | Category Written | Key |
|---|---|---|
| Data gathering step completed | `analysis_context` | `analysis/{task_id}/sources` |
| New consent documented | `consent_registry` | `consent/{contact_hash}` |
| Opt-out received | `opt_out_registry` | `optout/{contact_hash}` |
| Operator sets preference | `operator_preferences` | `preferences/{name}` |

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

## 10. Degraded Mode — MemoryPalace Unavailable

When MemoryPalace is unreachable at session start or becomes unavailable mid-session:

1. Mira enters **stateless mode**: only the in-process LangChain turn buffer (k=20) is available.
2. Consent and opt-out checks must be performed via MCAS fallback or manual operator confirmation.
3. Metric emitted: `mira_memory_unavailable_total`.

---

## 11. Retention, Review, and Purge

### Retention Policy

| Category | Retention | Pruning Rule |
|---|---|---|
| `analysis_context` | Session end | Auto-purged on session close |
| `consent_registry` | Indefinite | Immutable — no purge without HOB approval |
| `opt_out_registry` | Indefinite | Immutable — no purge without HOB approval |
| `operator_preferences` | Indefinite | Manual operator deletion only |

### 90-Day Review Cycle

1. Verify no case content or PII has accumulated in `analysis_context`.
2. Confirm `consent_registry` entries are accurate and complete.
3. Confirm `opt_out_registry` is being honored across all channels.
4. Review `operator_preferences` for relevance.

---

## 12. Security and Audit

### Access Control

- Mira accesses MemoryPalace using a scoped API key authorized only for the `mira` agent scope.
- No other agent may read or write to the `mira` scope without explicit Paperclip authorization.

### Write Audit Trail

Every MemoryPalace write generates:
- A LangSmith trace event tagged `event_type=memory_write`
- A Loki log entry with `agent=mira`, `session_id`, `category`, `key`
- A Prometheus metric increment: `mira_memory_writes_total{category, scope}`

Every blocked write generates:
- A LangSmith trace event tagged `event_type=memory_write_rejected`
- A Prometheus metric increment: `mira_memory_write_rejected_total{rejection_reason}`
- Veritas escalation if the rejection reason is `tier1_content` or `tier0_content`

---

*This document is maintained alongside `agent.yaml`, `SOUL.md`, `POLICY.md`, `config.yaml`, and `GUARDRAILS.yaml`.*
