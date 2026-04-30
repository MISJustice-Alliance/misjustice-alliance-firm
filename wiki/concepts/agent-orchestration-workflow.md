---
title: Agent Orchestration Workflow
created: 2026-04-26
updated: 2026-04-26
type: concept
tags: [workflow, orchestration, agent]
sources: [raw/articles/agents-md-firm-roster.md]
confidence: high
---

# Agent Orchestration Workflow

The four-stage workflow governing how MISJustice Alliance Firm agents collaborate: Intake → Research → Drafting → Advocacy.

## Key Details
- Domain: AI legal advocacy and research
- Structure: Zero-human company (ZHC)
- Governance: Board-approved decisions via Paperclip

## Crew Process Types

Each crew uses a CrewAI `Process` suited to its task dependencies:

- **Sequential** — tasks have downstream data dependencies (Intake, Advocacy, Support)
- **Parallel** — tasks are independent and can run simultaneously (Research)
- **Hierarchical** — a manager agent reviews and delegates (Drafting, with Lex as manager)

## Tool Integration

Agents receive tools dynamically via the tool registry. See [[agent-tool-suite]] for the inventory and [[crewai-orchestrator-bridge]] for runtime wiring.

## Related
- [[misjustice-alliance-firm]]
- [[zero-human-company]]
- [[crewai-orchestrator-bridge]]
- [[agent-tool-suite]]
- [[lex-lead-counsel]]
