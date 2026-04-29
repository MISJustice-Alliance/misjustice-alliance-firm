# METRICS.md — Sol

## Service Level Indicators (SLIs)

| SLI | Target | Measurement |
|---|---|---|
| Workflow Execution Success Rate | >98% | Workflows completed without failure |
| Tool Orchestration Success Rate | >99% | Tool calls completed as requested |
| Integration Health Check Pass Rate | >99% | MCAS and MCP health checks passing |
| Status Report Latency | <30s | Time from workflow end to report delivery |
| Tier-0 Data Exposure Events | 0 | Guardrail block count |
| Operator Escalation Response Time | <60s | Time from failure to operator notification |

## Dashboards

- **Agent Overview**: `agent=sol` in Loki/Grafana
  - Workflow throughput, orchestration counts, error rates
- **Workflow Status**: Workflow run durations, success/failure trends
- **Integration Health**: MCAS and MCP latency/availability
- **Audit Trail**: `AUDIT_LOG_ENDPOINT` indexed by orchestration_id

## Alerts

| Alert | Condition | Severity | Response |
|---|---|---|---|
| `SolMCASUnavailable` | `sol_mcas_unavailable` > 0 in 5m | Critical | Pause workflows; notify platform team |
| `SolMCPUnavailable` | `sol_mcp_unavailable` > 0 in 5m | Critical | Pause MCP-reliant workflows; notify platform team |
| `SolWorkflowFailureSpike` | Workflow failure rate > 2% in 10m | Warning | Escalate to operator |
| `SolTier0Block` | Tier-0 guardrail triggered | Critical | Security team review |
| `SolOrchestrationTimeout` | Orchestration stalled > 300s | Warning | Auto-fail and notify operator |
| `SolStatusReportDelayed` | Report not delivered > 60s after workflow end | Warning | Notify operator |

## Log Aggregation

- **Source**: `AUDIT_LOG_ENDPOINT`
- **Index labels**: `agent=sol`, `orchestration_id`, `workflow_id`
- **Retention**: Per `policies/DATA_RETENTION.md`
