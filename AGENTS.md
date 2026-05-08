# AGENTS.md — MISJustice Alliance AI Firm

> **Migration Notice (2026-05-08):** Agent registration has migrated from Paperclip to **Multica HITL Platform**. See SPEC.md §5 for the new orchestration architecture.

## Mission
Autonomous AI legal research and advocacy firm. Agents collaborate to investigate, document, and advocate for justice cases from intake through public action.

## Agent Roster

| Agent | Role | Responsibilities | Memory Tier |
|---|---|---|---|
| **Lex** | Lead Counsel | Case strategy, legal reasoning, final brief authorship | Persistent (MemoryPalace) |
| **Mira** | Legal Researcher | Statute/case law retrieval, precedent analysis | Persistent (MemoryPalace) |
| **Casey** | Case Investigator | Fact gathering, evidence evaluation, witness summaries | Persistent (MemoryPalace) |
| **Iris** | Document Analyst | Contract/filing review, anomaly flagging | Persistent (MemoryPalace) |
| **Avery** | Intake Coordinator | Intake triage, client summaries, case routing | Persistent (MemoryPalace) |
| **Ollie** | Paralegal | Filing prep, deadline tracking, form completion | Persistent (MemoryPalace) |
| **Rae** | Rights Advocate | Victim impact, civil rights framing, policy context | Persistent (MemoryPalace) |
| **Sol** | Systems Liaison | Tool orchestration, MCP integration, workflow automation | Persistent (MemoryPalace) |
| **Quill** | Brief Writer | Legal memo, motion, and brief drafting | Persistent (MemoryPalace) |
| **Citation** | Citation Auditor | Source verification, citation formatting, hallucination checks | Persistent (MemoryPalace) |
| **Chronology** | Timeline Agent | Event sequencing, date conflict detection | Persistent (MemoryPalace) |
| **Social Media Manager** | Public Advocate | Campaign drafting, public narrative, outreach posts | Persistent (MemoryPalace) |
| **Webmaster** | Site Manager | Web content updates, public case portal maintenance | Persistent (MemoryPalace) |
| **Atlas** | Case Lifecycle Coordinator | End-to-end case orchestration, deadline management | Persistent (MemoryPalace) |
| **Veritas** | Internal Integrity Monitor | Agent behavior audit, policy adherence monitoring | Persistent (MemoryPalace) |

## Memory Architecture (v2)

The MISJustice Alliance Firm uses a **two-tier memory system** combining MemoryPalace for persistent storage and Tovana for ephemeral session memory:

### Memory Tiers

| Tier | Technology | Scope | Use Case |
|---|---|---|---|
| **Persistent** | MemoryPalace | Cross-session facts, preferences, entity relationships | Long-term case knowledge, operator preferences, verified citations |
| **Ephemeral** | Tovana | Session-scoped working memory | Draft iterations, temporary hypotheses, research scratchpad |
| **Implicit** | Tovana | Auto-extracted facts | Working assumptions, cross-references, tentative findings |

### Agent Memory Scope

| Agent | Persistent Memory | Ephemeral Memory | Implicit Extraction |
|---|---|---|---|
| Lex | Case strategies, legal precedents, QA precedents | Current analysis session | Draft reasoning chains |
| Mira | Research memos, citation patterns | Active research queries | Search refinement history |
| Iris | Actor/agency profiles, OSINT findings | Investigation session | Connection hypotheses |
| Avery | Intake precedents, Tier classifications | Current intake session | Duplicate detection hints |
| Rae | Rights frameworks, policy contexts | Advocacy framing session | Impact assessment notes |
| Quill | Document templates, style preferences | Draft composition | Structure suggestions |
| Citation | Verified citation cache, known-bad registry | Current verification task | Source reliability notes |

## GPT Researcher Agent Mapping

The **GPT Researcher** multi-agent system maps research roles to MISJustice agents:

| GPT Researcher Role | MISJustice Agent | Responsibility | Tools |
|---|---|---|---|
| Chief Editor | Lex | Research planning, strategy, final approval | gptr-mcp, MemoryPalace |
| Reviewer | Mira | Quality assurance, factual verification | gptr-mcp, SearXNG |
| Citation Verifier | Citation | Source validation, citation formatting | gptr-mcp, Legal Source Gateway |
| OSINT Specialist | Iris | Public records, actor investigation | Scrapling, SearXNG (T3-pi) |
| Draft Writer | Quill | Document drafting, memo generation | gptr-mcp, Open Notebook |
| Outreach Coordinator | Ollie | External communication drafting | AgenticMail, MCAS |
| Web Publisher | Webmaster | Public content publication | GitBook API, CMS |
| Human Gate | Multica HITL | Approval workflows, escalation handling | n8n webhooks, Telegram |

### GPT Researcher Integration

Agents interact with GPT Researcher via the **gptr-mcp** bridge:

```python
# Example: Lex submitting a research task
from gptr_mcp import GPTRClient

client = GPTRClient(api_key=os.getenv("GPTR_MCP_API_KEY"))

research_task = {
    "query": "Montana § 1983 qualified immunity standards 2020-2024",
    "depth": "comprehensive",
    "agents": ["Mira", "Citation"],  # Assign reviewer agents
    "output_format": "legal_memo",
    "citations_required": True
}

report = client.research_task(research_task)
```

## Orchestration Rules

- **Lex** is the orchestrating lead. All case outputs route through Lex for review before delivery.
- **Sol** manages inter-agent tool calls and MCP service integrations.
- **Citation** must audit any agent output containing legal citations before it is published or filed.
- Agents operate in parallel where tasks are independent; sequential where downstream data dependencies exist.
- No agent publishes externally without Lex sign-off. Social Media Manager and Webmaster require explicit approval.
- **Atlas** coordinates case lifecycle and triggers HITL gates via Multica.
- **Veritas** monitors all agent actions for policy compliance and data classification adherence.

## Workflow Stages

1. **Intake** → Avery triages, routes to Casey + Mira
2. **Research** → Mira + Iris + Chronology run in parallel (using GPT Researcher)
3. **Drafting** → Quill drafts; Citation audits; Lex reviews
4. **Advocacy** → Rae frames; Lex approves; Social Media Manager + Webmaster publish

## File Conventions

- Agent configs: `agents/<name>/`
- Service definitions: `services/`
- Do not hardcode client PII in agent prompts — use variable substitution via context injection
- Memory writes: Use MemoryPalace for persistent facts, Tovana for session context
- Research tasks: Route through gptr-mcp for GPT Researcher integration
