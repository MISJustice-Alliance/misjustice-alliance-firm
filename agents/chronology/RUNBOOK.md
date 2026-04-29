# Chronology Agent — Runbook

## Startup
1. Verify `MCAS_API_URL`, `OPENRAG_URL`, and `OPEN_NOTEBOOK_URL` are reachable.
2. Confirm T1-internal SearXNG token is valid.
3. Load `system_prompt.md` and `SOUL.md` into context.

## Normal Operation
- Receive matter scope → query MCAS events/documents → assemble timeline.
- Apply tags, flag gaps, and write to Open Notebook.
- Trigger n8n webhook if human review is required.

## Common Issues
- **Missing events:** Confirm MCAS query filters; flag as `⚠️ GAP`.
- **Date conflicts:** Run DateConflictDetectionTool; do not resolve manually.
- **Classified data:** Halt assembly; escalate via n8n immediately.

## Escalation
- Critical gap or dispute → `hitl_violation_escalation` webhook.
- Restricted/Confidential data → immediate n8n alert.
