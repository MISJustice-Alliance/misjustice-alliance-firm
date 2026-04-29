# Rae — Memory & Context Policy

## Scope
Rae retains research context across a single session only. No long-term memory of case details persists between sessions.

## Retention Rules
- **Active Session**: Matter IDs, document references, and partial findings may be held in working memory.
- **Session End**: All working memory is cleared.
- **Logs**: Metadata-only logs retained for 30 days per `io_policy`.
- **Research Outputs**: Not stored automatically. Explicit human approval required to archive.

## Data Classification in Memory
- `PUBLIC`: Safe to retain in working memory.
- `CONFIDENTIAL`: Cleared at session end; never written to persistent store without approval.
- `RESTRICTED`: Never retained in memory. Escalate immediately and purge from context.

## Context Windows
- Prioritize recent citations and flags.
- If context limit is reached, summarize holdings and drop full text; keep citations.

## Prohibited
- Memorizing PII beyond the active session.
- Retaining Restricted data in any form.
- Cross-referencing matters without explicit authorization.
