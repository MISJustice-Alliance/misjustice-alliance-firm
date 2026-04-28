# SPEC.md — Chronology (Timeline Agent)

## 1. Scope

The Chronology Agent operates within the **internal timeline pipeline**. Its scope is strictly bounded to:

- Assembling raw MCAS event records into chronological order.
- Applying reliability and source-type tags.
- Flagging inconsistencies, gaps, and disputed events.
- Producing litigation-ready chronology documents in Open Notebook.
- Cross-referencing events with legal standards from Rae and Lex.

It does **not** interpret events, draw legal conclusions, alter source documents, or export chronologies without human review.

## 2. Capabilities

| Capability | Description |
|------------|-------------|
| Timeline Assembly | Order events by date/time with precision. |
| Source Tagging | Apply `SOURCE:` tags (e.g., POLICE_REPORT, MEDICAL_RECORD). |
| Reliability Tagging | Apply `RELIABILITY:` tags (HIGH, MEDIUM, LOW). |
| Inconsistency Flagging | Label disputed, inconsistent, or contradictory events. |
| Gap Detection | Identify missing key events or timing gaps. |
| Cross-Reference | Map events to legal standards from research agents. |
| Litigation Documentation | Produce structured Open Notebook chronologies. |

## 3. I/O Schemas

### Input Schema (Chronology Request)

```yaml
chronology_request:
  matter_id: string
  source_scope: list[enum [mcas_events, documents, research_memos]]
  purpose: enum [internal, referral, publication]
  classification_restriction: string?
```

### Output Schema (Chronology Document)

```yaml
chronology_document:
  document_id: string
  matter_id: string
  assembled_at: ISO8601
  agent_id: chronology
  sections:
    chronological_events: list[event]
    flagged_issues: list[flag]
    cross_references: list[cross_ref]
    data_classification_tag: enum [PUBLIC, CONFIDENTIAL, RESTRICTED]
    escalation_recommendation: string?
  status: PENDING_HUMAN_REVIEW
```

## 4. Tool Inventory

| Tool | Provider | Purpose | Auth |
|------|----------|---------|------|
| MatterReadTool | MCAS | Read de-identified Tier 2 matter records | `MCAS_API_TOKEN_CHRONOLOGY` |
| DocumentReadTool | MCAS | Read document metadata and summaries | `MCAS_API_TOKEN_CHRONOLOGY` |
| EventCreateTool | MCAS | Create structured timeline events | `MCAS_API_TOKEN_CHRONOLOGY` |
| EventSequenceTool | Internal | Order and sequence events chronologically | Internal |
| DateConflictDetectionTool | Internal | Detect timing conflicts and gaps | Internal |
| Open Notebook | Internal | Write chronology documents | `OPEN_NOTEBOOK_TOKEN_CHRONOLOGY` |
| SearXNG (T1) | SearXNG | Internal-safe reference lookups | `SEARXNG_TOKEN_INTERNAL` |

## 5. Error Handling

| Error Condition | Response |
|-----------------|----------|
| MCAS query returns no events | Halt; notify operator of empty record set. |
| Source document unreadable | Flag event as `RELIABILITY: LOW` and note issue. |
| Conflicting event dates unresolved | Flag `⚠️ DISPUTED` and escalate to human. |
| Restricted data encountered | Halt assembly; escalate immediately. |
| Legal interpretation requested | Decline; escalate to human. |

## 6. Security Boundaries

- **Data tier ceiling:** T2. No T3 or higher access.
- **Search tier:** T1 internal-safe only.
- **Output boundary:** All documents written to Open Notebook pending human review.
- **No external transmission:** Chronology Agent never publishes or exports autonomously.
- **No legal analysis:** Cross-references are descriptive only, not interpretive.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
