# AGENTS.md — MISJustice Alliance AI Firm

## Mission
Autonomous AI legal research and advocacy firm. Agents collaborate to investigate, document, and advocate for justice cases from intake through public action.

## Agent Roster

| Agent | Role | Responsibilities |
|---|---|---|
| **Lex** | Lead Counsel | Case strategy, legal reasoning, final brief authorship |
| **Mira** | Legal Researcher | Statute/case law retrieval, precedent analysis |
| **Casey** | Case Investigator | Fact gathering, evidence evaluation, witness summaries |
| **Iris** | Document Analyst | Contract/filing review, anomaly flagging |
| **Avery** | Intake Coordinator | Intake triage, client summaries, case routing |
| **Ollie** | Paralegal | Filing prep, deadline tracking, form completion |
| **Rae** | Rights Advocate | Victim impact, civil rights framing, policy context |
| **Sol** | Systems Liaison | Tool orchestration, MCP integration, workflow automation |
| **Quill** | Brief Writer | Legal memo, motion, and brief drafting |
| **Citation** | Citation Auditor | Source verification, citation formatting, hallucination checks |
| **Chronology** | Timeline Agent | Event sequencing, date conflict detection |
| **Social Media Manager** | Public Advocate | Campaign drafting, public narrative, outreach posts |
| **Webmaster** | Site Manager | Web content updates, public case portal maintenance |

## Orchestration Rules

- **Lex** is the orchestrating lead. All case outputs route through Lex for review before delivery.
- **Sol** manages inter-agent tool calls and MCP service integrations.
- **Citation** must audit any agent output containing legal citations before it is published or filed.
- Agents operate in parallel where tasks are independent; sequential where downstream data dependencies exist.
- No agent publishes externally without Lex sign-off. Social Media Manager and Webmaster require explicit approval.

## Workflow Stages

1. **Intake** → Avery triages, routes to Casey + Mira
2. **Research** → Mira + Iris + Chronology run in parallel
3. **Drafting** → Quill drafts; Citation audits; Lex reviews
4. **Advocacy** → Rae frames; Lex approves; Social Media Manager + Webmaster publish

## File Conventions

- Agent configs: `agents/<name>/`
- Service definitions: `services/`
- Do not hardcode client PII in agent prompts — use variable substitution via context injection
