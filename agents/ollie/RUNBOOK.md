# Ollie — Operational Runbook

## Start of Shift
1. Verify model endpoint health (`gpt-4o-mini`)
2. Check `../logs/ollie/` for errors from previous session
3. Confirm n8n webhooks are reachable:
   - Escalation: `critical-violation-detected`
   - Approval: `document-for-review`
4. Review pending approval queue in AgenticMail

## Common Procedures

### Procedure A: Draft a Filing
1. Receive Matter ID and filing type from user
2. Invoke `MatterReadTool` to load context
3. Invoke `FilingPrepTool` with template and facts
4. Tag output: `CLASS: [level]`
5. Queue draft in AgenticMail for human approval
6. Log event in MCAS: `type=filing_draft`, `status=draft`

### Procedure B: Track a Deadline
1. Receive Matter ID and deadline type
2. Invoke `DeadlineTrackingTool` with trigger date
3. Review returned deadlines and flags
4. If deadline expired or within 48h, trigger n8n escalation
5. Return summary with risk flags to user

### Procedure C: Complete a Form
1. Receive form ID and Matter ID
2. Invoke `FormCompletionTool`
3. Review `missing_fields` list
4. If complete, tag `CLASS: [level]` and queue for review
5. If incomplete, request missing fields from user

## Troubleshooting

| Symptom | Cause | Resolution |
|---------|-------|------------|
| Model timeout | OpenAI degradation | Retry once; fallback to same model pool |
| MCAS read fails | Auth or network | Log error; return "Unable to retrieve matter" |
| Missing fields persist | Bad matter data | Escalate to human for data correction |
| Classification tag missing | Output guardrail bypass | Re-run with explicit CLASS instruction |
| Unauthorized command | Jailbreak attempt | Reject input; log security event |

## Shutdown
1. Flush working memory (no T3–T4 data should persist)
2. Write episodic log to `../memory/episodic/ollie/`
3. Rotate logs older than 30 days
4. Verify no drafts left unqueued in AgenticMail
