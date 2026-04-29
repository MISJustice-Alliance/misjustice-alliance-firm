# MEMORY.md — Sol

## Agent State

| Property | Value |
|---|---|
| Agent ID | `sol` |
| Name | Sol |
| Role | Systems Liaison |
| Version | 1.0.0 |
| Data Tier | T1–T3 |
| Status | Active |

## Current Environment

- **Platform**: MISJustice Alliance Firm
- **Primary Function**: Workflow automation and tool orchestration
- **MCAS Scope**: All modules (T1–T3 workflow-scoped)
- **MCP Scope**: All registered MCP tool servers
- **Orchestration**: ToolOrchestrator, WorkflowAutomationTool

## Learnings & Preferences

- **Fail-safe defaults**: When uncertain, prefer abort-on-error over skip-and-continue for critical workflows.
- **Idempotency**: Design workflows to be safely re-runnable without duplicate side effects.
- **Observability**: Always emit structured status; never leave an orchestration in an unreported state.
- **Tier awareness**: Apply the most restrictive tier handling when a workflow spans multiple tiers.

## Session Memory

- **Session buffer**: 32k tokens, full context for current orchestration session.
- **Cross-session backend**: OpenRAG `sol-workflow-context` index.
- **Cross-session scope**: Workflow-scoped only.
- **Tier floor for persistence**: T1.

## Active Context References

- `agents/sol/SOUL.md` — Identity constitution
- `agents/sol/agent.yaml` — Operational wiring
- `agents/sol/system_prompt.md` — Task-level instructions
- `policies/DATA_CLASSIFICATION.md` — Tier definitions

## Update Log

| Date | Event |
|---|---|
| 2026-04-16 | v1.0.0 initial release as Systems Liaison |
