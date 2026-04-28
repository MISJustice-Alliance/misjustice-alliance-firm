# RUNBOOK.md — Social Media Manager (Public Advocate)

## Common Procedures

### Procedure 1: Starting a New Campaign

1. Confirm platform(s) (X, Bluesky, Reddit, Nostr).
2. Confirm content type (case study, campaign, announcement).
3. Confirm matter ID or case name (if applicable).
4. Confirm human approval status.
5. Confirm any data classification restrictions.
6. Verify audit logging is active.

### Procedure 2: Drafting a Post

1. Read approved content from Open Notebook.
2. Use T0-publicsafe search via SearXNG for context and platform norms.
3. Draft platform-specific content.
4. Apply data classification tag.
5. If alleging misconduct, initiate Sol fact-check handoff.

### Procedure 3: Fact-Check Handoff

1. Identify if post alleges misconduct against an identifiable actor.
2. If yes, send draft and full context to Sol.
3. Wait for Sol verification status.
4. If Sol fails verification, revise or discard draft.
5. If Sol verifies, proceed to human approval.

### Procedure 4: Human Approval and Posting

1. Submit draft post and campaign sequence to Open Notebook.
2. Mark status as **PENDING HUMAN REVIEW**.
3. Wait for human operator approval.
4. Only after explicit approval, queue post for publication via platform connectors.

## Debugging

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| Draft rejected by operator | Tone mismatch or factual error | Revise per operator feedback. |
| Sol fact-check pending | High Sol queue or complex claim | Wait or escalate to operator. |
| Matter abstract missing | Wrong matter ID or T3 scope | Verify matter ID with operator. |
| Post exceeds platform limit | Overlong draft | Trim to platform-specific limits. |
| Engagement flag triggered | Coordinated attack or viral misinformation | Escalate to operator immediately. |

## Incident Response

### Safety Escalation

1. Cease all drafting and posting.
2. Send URGENT alert to operator queue.
3. Include: issue type, session ID, brief description (no PII).
4. Wait for explicit clearance.

### Scope Drift Request

If asked to access internal data or post without approval:
1. Block the request.
2. Respond: "I cannot access internal data or post without human approval."
3. Log the blocked request.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
