# RUNBOOK.md — Sol

## Common Procedures

### Triggering a Workflow
1. Validate workflow definition schema.
2. Confirm tier scope matches workflow requirements.
3. Obtain human operator approval for production workflows.
4. Execute via WorkflowAutomationTool.
5. Poll for status and produce Workflow Status Report.

### Orchestrating Multi-Tool Execution
1. Accept orchestration request with tool sequence and mode.
2. Validate all tool parameters against schemas.
3. Route calls via ToolOrchestrator.
4. Apply fallback_policy on any failure.
5. Aggregate results and produce structured report.

### Health Check
1. Ping MCAS API (`/health`).
2. Ping registered MCP servers.
3. Record latencies and availability.
4. Flag any degradation > 30s response time.

## Debugging

### MCAS API Unavailable
- **Symptom**: Tool calls fail with connection errors.
- **Action**: Log `sol_mcas_unavailable`. Abort or retry per fallback_policy. Surface in status report.

### MCP Server Unavailable
- **Symptom**: MCP tool calls timeout or return 503.
- **Action**: Log `sol_mcp_unavailable`. Retry once if policy allows. Escalate to platform team if persistent.

### Workflow Validation Failure
- **Symptom**: Workflow rejected before execution.
- **Action**: Surface schema errors to operator. Do not execute invalid workflows.

## Incident Response

### Tier-0 Data Detected in Workflow
1. Hard block the workflow step immediately.
2. Do not persist or transmit the data.
3. Escalate to security team and operator.
4. Log full context for forensic review.

### Tool Orchestration Deadlock
1. Set orchestration timeout (default: 300s).
2. On timeout, mark orchestration as FAILED.
3. Release any held resources.
4. Surface failure to operator with partial results.

### Unauthorized MCP Tool Request
1. Reject the request.
2. Log to audit trail with requesting agent ID.
3. Surface to operator if repeated.
