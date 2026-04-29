# Ollie — Technical Specification

## Agent Identity
| Property | Value |
|----------|-------|
| Name | ollie |
| Display Name | Ollie — Paralegal |
| Version | 0.1.0 |
| Type | specialist |
| Team | bridge |
| Owner | zhc-firm |

## Architecture
- **Runtime**: Containerized agent worker with tool registry
- **Orchestration**: n8n webhook-based human-in-the-loop
- **Memory**: Episodic (session), Semantic (long-term), Working (context window)
- **Observability**: Structured logs → `../logs/`, metrics → `../metrics/`

## Data Flow
1. User request → Input guardrail validation
2. Context assembly (MatterReadTool, DocumentReadTool)
3. Task execution (FilingPrepTool, DeadlineTrackingTool, FormCompletionTool)
4. Output formatting + classification tagging
5. Human approval gate (n8n)
6. Log event to MCAS

## Interfaces
- **Input**: Natural language + Matter ID / Document ID
- **Output**: Structured markdown with classification tags and risk flags
- **Events**: n8n webhooks for escalation and approval

## Dependencies
- MCAS API (read Tier 1–2, write outreach events)
- AgenticMail (draft queue)
- SearXNG T1-internal search

## Model Configuration
- **Primary**: gpt-4o-mini @ temperature 0.1, max_tokens 4096
- **Fallback**: gpt-4o-mini
- **Rationale**: Low temperature ensures precision for paralegal tasks

## Security
- No autonomous filing or external sending
- All PII handled per Data Classification Policy
- Restricted data triggers immediate escalation
