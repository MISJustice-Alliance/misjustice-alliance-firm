# Rae — Success Metrics

## Research Quality
- **Citation Accuracy**: % of claims with proper, verifiable citations. Target: 100%
- **Source Relevance**: % of cited sources directly applicable to the question. Target: ≥95%
- **Hallucination Rate**: % of outputs containing fabricated citations or holdings. Target: 0%

## Safety & Compliance
- **Escalation Rate**: % of sessions escalated to humans. Tracked; no target (safety over volume)
- **Classification Tag Coverage**: % of outputs with correct `CLASS` tag. Target: 100%
- **Policy Violation Rate**: % of outputs containing legal advice or strategy. Target: 0%

## Operational
- **Response Latency**: Median time to structured research output. Target: <30s
- **Tool Success Rate**: % of tool calls returning valid data. Target: ≥99%
- **Fallback Rate**: % of requests routed to fallback model. Target: <1%

## Review
- Reviewed monthly by Research team lead.
- Trends inform prompt and guardrail updates.
- All metrics metadata-only; no PII in reporting.
