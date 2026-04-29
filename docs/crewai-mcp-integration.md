# CrewAI MCP & Skills Integration

## References

- **CrewAI MCP Docs:** https://docs.crewai.com/mcp
- **CrewAI Skills Registry:** https://skills.sh/crewaiinc/skills

## Architecture Decision

| Layer | Tool | Use Case |
|---|---|---|
| **Lightweight Agent Teams** | CrewAI | Fast, deterministic workflows; intake, research, drafting |
| **Heavy-weight Complex Agents** | OpenClaw | Long-running actions, wide skill arrays, multi-step reasoning |

## Current Implementation

### CrewAI Orchestrator (`crewai-orchestrator/`)

```
crewai-orchestrator/
├── src/misjustice_crews/
│   ├── agents/
│   │   └── factory.py          # Agent factory with role-based configs
│   ├── crews/
│   │   ├── intake_crew.py      # Triage and routing
│   │   ├── research_crew.py    # Legal research and precedent analysis
│   │   ├── drafting_crew.py    # Memo and brief drafting
│   │   ├── advocacy_crew.py    # Public advocacy campaigns
│   │   └── support_crew.py     # Paralegal and filing support
│   ├── tasks/
│   │   └── *_tasks.py          # Task definitions per crew
│   ├── tools/
│   │   ├── mcp_tools.py        # MCP server integration tools
│   │   └── mcas_tools.py       # MCAS service tools
│   └── main.py               # CLI entrypoint
├── tests/
└── Dockerfile
```

### MCP Tools (`tools/mcp_tools.py`)

The orchestrator exposes three MCP-powered tools:

1. **`mcp_cases_get`** — Retrieve case data from the legal-research MCP server
2. **`mcp_citations_resolve`** — Resolve legal citations via MCP
3. **`mcp_statutes_search`** — Search statutes with optional jurisdiction filter

All tools use JSON-RPC over HTTP to communicate with the MCP gateway.

### Crews Map

| Crew | Agents | Purpose |
|---|---|---|
| `intake` | Avery, Sol | Client intake triage and routing |
| `research` | Mira, Iris, Chronology | Legal research and precedent analysis |
| `drafting` | Quill, Citation, Lex | Brief drafting and citation auditing |
| `advocacy` | Rae, Social Media Manager | Public advocacy and campaign drafting |
| `support` | Ollie, Atlas | Paralegal tasks and filing support |

## OpenClaw Integration

OpenClaw handles complex, long-running tasks that require:
- Multi-step reasoning across many tools
- Persistent state across sessions
- Advanced skill orchestration
- Integration with external services (Arweave, Turbo, etc.)

OpenClaw agents live in `openclaw-ansible/` and are deployed via Ansible playbooks.

## Skills Strategy

### CrewAI Skills (Lightweight)

CrewAI agents use skills from https://skills.sh/crewaiinc/skills for:
- Document parsing
- Web search
- Database queries
- Simple API integrations

### OpenClaw Skills (Heavy-weight)

OpenClaw agents use the full skill library in `agents/<name>/tools.yaml` for:
- Arweave permaweb operations
- Complex legal analysis pipelines
- Multi-agent coordination
- Long-running background tasks

## Deployment

### CrewAI Orchestrator

```bash
cd crewai-orchestrator
python -m misjustice_crews.main run-crew research --matter-id CR-2025-001
```

### OpenClaw Agents

```bash
cd openclaw-ansible
ansible-playbook playbooks/deploy-agents.yml
```

## Next Steps

1. Register CrewAI skills from skills.sh registry
2. Add MCP server discovery (auto-detect available tools)
3. Implement crew-to-OpenClaw handoff for complex matters
4. Add metrics and observability for both orchestrators
