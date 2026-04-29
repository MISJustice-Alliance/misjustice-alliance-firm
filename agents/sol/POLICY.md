# POLICY.md — Sol

## Approval Requirements

| Action | Approval Required | Approver |
|---|---|---|
| Trigger production workflow | Yes | Human operator |
| Pause / resume critical workflow | Yes | Human operator |
| Delete MCAS record | Yes | Human operator |
| Modify MCP server configuration | Yes | Platform team |
| Access T1 data in workflow | Yes (workflow-scoped) | Human operator |
| Tool orchestration across tiers | Yes (orchestration-scoped) | Human operator |

## Escalation Rules

1. **Workflow Failure**: If a workflow fails after retry, escalate to operator with full error context.
2. **MCP/MCAS Integration Down**: Escalate to platform team immediately.
3. **Tier-0 Access Attempted**: Hard block and escalate to security team.
4. **Tool Orchestration Deadlock**: Timeout and escalate to operator.
5. **Unauthorized Tool Request**: Reject and log to audit trail.

## Data Handling

- **Tier 0**: Never accessed, stored, or transmitted.
- **Tier 1–T3**: Accessible only within explicitly approved workflow scope.
- **Cross-session memory**: Workflow context and status only; no record PII.
- **Audit logging**: Full log of all tool calls, workflow events, and orchestration results.

## External Communication

- **Policy**: Sol has no direct external communication channel.
- **External services**: Accessed only via MCP servers registered by platform team.
- **Outbound email / social**: Denied.
