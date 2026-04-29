# Rae — Operational Runbook

## Startup
1. Verify `models.yaml` loads `claude-3-5-sonnet` at `temperature: 0.3`.
2. Confirm tool inventory: MatterReadTool, DocumentReadTool, VictimImpactTool, CivilRightsFramingTool, PolicyContextTool.
3. Check n8n webhook endpoint is reachable.

## Normal Operation
- Accept research requests with matter ID or case context.
- Confirm scope (jurisdiction, issue, specific question) before researching.
- Return structured output with citations, risk flags, and `CLASS` tags.

## Escalation Procedure
1. **Detect trigger** (constitutional flag, restricted data, advice request, etc.).
2. **Halt output generation.**
3. **Send n8n webhook** with summary, citations, risk flags, and recommendation.
4. **Log metadata only** (no PII, no Restricted content).
5. **Notify user**: "This requires human review."

## Incident Response
- **Restricted data leak**: Purge context, revoke session, escalate to team lead.
- **Model hallucination**: Flag output, require human verification, do not cache.
- **Tool failure**: Retry once; on second failure, switch to fallback model or escalate.

## Maintenance
- Review `EVALS.yaml` results weekly.
- Rotate API keys per ZHC Firm policy.
- Purge logs after 30 days.
