## Expanded Architecture: MISJustice Alliance Firm v2

This is a substantial and well-reasoned set of additions. The five new components each slot into a distinct layer of the stack — none of them overlap awkwardly, and together they form a coherent research intelligence pipeline that wraps around Multica's HITL core.

***

## Component Role Mapping

| Component | Layer | Primary Function | Assigned Agents |
|---|---|---|---|
| **GPT Researcher + LangGraph multi-agent** | Research execution | Deep multi-source legal research, parallel subtopic drafting with built-in Reviewer/Revisor loop | Mira, Casey, Iris |
| **gptr-mcp** | MCP tool layer | Exposes GPTR as an MCP tool callable by any agent via Sol's MCP routing | Sol, Mira |
| **Tovana** | Ephemeral memory | Lightweight belief/context memory for narrow single-workflow runs (intake triage, citation audits) | Avery, Citation, Chronology |
| **Memory Palace** | Persistent memory | Long-term cross-case knowledge substrate for core defined agents | Lex, Mira, Casey, Rae |
| **Morphic** | Search middleware | Generative search UI/API between agents/humans and internal SearXNG | All research agents, human end-users |
| **SearXNG + Brave + Tavily + Exa + Scrapling** | Search retrieval backends | Distributed, federated source retrieval for GPTR and Morphic | Fed into GPTR retriever config |

***

## Architecture Layers (Updated)

```
┌─────────────────────────────────────────────────────────────────┐
│  HUMAN LAYER                                                     │
│  Multica Web UI (HITL approval inbox) ←→ Morphic Search UI      │
└────────────────────────┬────────────────────────────────────────┘
                         │ approval gates / task dispatch
                         ┌────────────────────────▼────────────────────────────────────────┐
                         │  ORCHESTRATION LAYER                                             │
                         │  Multica (task routing, approval gates, agent inbox)             │
                         │  ← MCP Server: gptr-mcp, GitHub MCP, custom tools via Sol       │
                         └────────────────────────┬────────────────────────────────────────┘
                                                  │
                                                  ┌───────────────────────▼────────────────────────────────────────┐
                                                  │  RESEARCH EXECUTION LAYER                                        │
                                                  │  GPT Researcher (LangGraph multi-agent)                          │
                                                  │  Chief Editor → parallel Researcher+Reviewer+Revisor → Writer   │
                                                  │  ↕ include_human_feedback=true gates at Multica inbox            │
                                                  └────────────────────────┬────────────────────────────────────────┘
                                                                           │
                                                                           ┌────────────────────────▼────────────────────────────────────────┐
                                                                           │  SEARCH / RETRIEVAL MIDDLEWARE                                   │
                                                                           │  Morphic (generative search API) → SearXNG → Brave/Tavily/Exa   │
                                                                           │  Scrapling (distributed scraping for document/court records)     │
                                                                           └────────────────────────┬────────────────────────────────────────┘
                                                                                                    │
                                                                                                    ┌────────────────────────▼────────────────────────────────────────┐
                                                                                                    │  MEMORY LAYER                                                    │
                                                                                                    │  Memory Palace (persistent, core agents)                         │
                                                                                                    │  Tovana (ephemeral, narrow workflow runs)                        │
                                                                                                    └─────────────────────────────────────────────────────────────────┘
                                                                                                    ```

                                                                                                    ***

## Key Integration Notes

**GPT Researcher ↔ Multica HITL** — GPTR's `include_human_feedback` flag in `task.json` maps directly to Multica approval gates.  Set `include_human_feedback: true` for all case research tasks so the Chief Editor pause points surface in the Multica inbox as Lex-review items before the Writer stage proceeds.

**gptr-mcp as a Sol-managed tool** — The [gptr-mcp server.py](https://github.com/assafelovic/gptr-mcp/blob/main/server.py) runs as a standalone Docker service exposing GPTR capabilities as MCP tools (`research`, `quick_search`, `write_report`).  Sol registers it in Multica's MCP tool registry, making deep research callable by any agent with a single tool invocation rather than requiring direct GPTR API integration per agent.

**Tovana for narrow workflows** — Tovana's belief-store pattern (lightweight semantic memory for a single agent run) is the right fit for Avery's intake triage, Citation's hallucination-checking pass, and Chronology's event-sequencing tasks — workflows that are stateless across cases but benefit from within-run context accumulation.  Memory Palace handles the durable cross-case knowledge that Lex, Mira, and Casey need.

**Morphic as the search UX layer** — Morphic acts as both a human-facing generative search interface and an API middleware between agents and SearXNG.  This means researchers or attorneys can run natural-language searches against the internal SearXNG instance through Morphic's UI, and agents can call the same Morphic API endpoint for structured search results with AI-synthesized summaries — avoiding direct SearXNG result parsing per agent.

**Search backend expansion** — GPTR's retriever config supports `RETRIEVER=searxng,tavily,brave,exa` as comma-separated sources.  Scrapling handles JavaScript-rendered and anti-bot-protected sources (court filing portals, PACER, state court dockets) that SearXNG cannot scrape reliably.

***

## Updated Hermes Agent Prompt (Addendum)

Append this block to the previous prompt:

***

```
## ADDITIONAL ARCHITECTURE: Research Intelligence Stack

In addition to the Multica refactor, integrate the following five components. Read each repo before 
making any changes. Work file-by-file as before.

---

### New Components to Integrate

**1. GPT Researcher + LangGraph Multi-Agent Stack**
Repo: https://github.com/assafelovic/gpt-researcher
Multi-agent: https://github.com/assafelovic/gpt-researcher/tree/main/multi_agents

Add `gpt-researcher` as a submodule at `gpt-researcher/`. Create a service config at 
`services/gpt-researcher/` with:
- `task.json` template pre-configured for legal research tasks:
  - `source: "web"` (overrideable to `"local"` for internal doc searches)
    - `include_human_feedback: true` (mandatory — routes Chief Editor pause points to Multica inbox)
      - `follow_guidelines: true`
        - `guidelines`: include MISJustice standard legal research guidelines (cite sources, 
            Bluebook format, flag unverified assertions, flag jurisdictional limits)
          - `publish_formats: { markdown: true, pdf: true, docx: true }`
          - `docker-compose` service definition for the GPTR backend (Python FastAPI, port 8000)
          - `docker-compose` service for the NextJS frontend (port 3000 — note: conflicts with Multica web 
            on 3000; map GPTR frontend to port 3001)
          - Map GPTR's multi-agent roles to existing AGENTS.md agents:
            - Chief Editor → Lex
              - Researcher → Mira
                - Reviewer → Citation (validation criteria) + Iris (document analysis)
                  - Revisor → Mira (revision pass)
                    - Writer → Quill
                      - Publisher → Ollie (filing prep) + Webmaster (public portal)
                        - Human → HITL gate in Multica inbox
                        - Add this mapping as a new section "GPT Researcher Agent Mapping" in AGENTS.md

                        **2. gptr-mcp MCP Server**
                        Repo: https://github.com/assafelovic/gptr-mcp

                        Add as submodule at `gptr-mcp/`. Add Docker Compose service (port 4000). Register in 
                        Sol's MCP tool manifest under the tool names: `gptr_research`, `gptr_quick_search`, 
                        `gptr_write_report`. Add env vars to `.env.example` under `## GPTR-MCP`:
                        - `GPTR_MCP_PORT=4000`
                        - `OPENAI_API_KEY` (already present, note shared)
                        - `TAVILY_API_KEY`
                        - `BRAVE_API_KEY`
                        - `EXA_API_KEY`
                        - `DOC_PATH=./data/case-docs` (for local source research)

                        **3. Tovana — Ephemeral Agent Memory**
                        Repo: https://github.com/assafelovic/tovana

                        Add as submodule at `tovana/`. Configure as the memory backend for:
                        - Avery (intake triage context within a session)
                        - Citation (hallucination-check context within a single audit pass)
                        - Chronology (event sequence context within a single timeline build)

                        Add a `## Memory Architecture` section to AGENTS.md:
                        ```
### Memory Tiers
                        - **Memory Palace** (persistent): Lex, Mira, Casey, Rae, Quill — cross-case knowledge, 
                          legal precedents, entity relationships, case history
                          - **Tovana** (ephemeral/session): Avery, Citation, Chronology, Ollie — within-run context 
                            only, no persistence across sessions
                            - **Multica inbox history**: Provides implicit short-term context for human reviewers
                            ```

                            **4. Morphic — Generative Search Middleware**
                            Repo: https://github.com/miurla/morphic

                            Add as submodule at `morphic/`. Add Docker Compose service (port 3002). Configure as 
                            middleware between agents/humans and SearXNG:
                            - Set Morphic's search backend to the internal SearXNG instance URL
                            - Add Brave, Tavily, and Exa as additional Morphic search providers via env vars
                            - Expose Morphic's API endpoint (`/api/search`) as an MCP tool registered with Sol 
                              under the name `morphic_search`
                              - Morphic's web UI (port 3002) serves as the human-facing research search interface
                              - Add env vars under `## MORPHIC` in `.env.example`:
                                - `MORPHIC_PORT=3002`
                                  - `SEARXNG_API_URL=http://searxng:8080`
                                    - `BRAVE_SEARCH_API_KEY` (same as BRAVE_API_KEY above, note shared)
                                      - `TAVILY_API_KEY` (shared)
                                        - `EXA_API_KEY` (shared)
                                          - `OPENAI_API_KEY` (shared, for Morphic's generative synthesis)

                                          **5. Scrapling — Distributed Web Scraping**
                                          Repo: https://github.com/D4Vinci/Scrapling

                                          Add as submodule at `scrapling/`. Configure as the scraping backend for:
                                          - Court docket scraping (PACER, state court portals, CourtListener)
                                          - Document retrieval from URLs that SearXNG cannot render (JS-heavy, anti-bot)
                                          - Add a `services/scrapling/` service config
                                          - Register a `scrapling_fetch` MCP tool with Sol for on-demand URL scraping by any agent
                                          - Add `SCRAPLING_STEALTH=true` in `.env.example` under `## SCRAPLING`

                                          **6. Search Backend Expansion**
                                          Update GPTR's retriever configuration in `services/gpt-researcher/task.json` and the 
                                          `.env.example` to support the following search backends:
                                          - `RETRIEVER=searxng,tavily,brave,exa` (comma-separated, GPTR multi-retriever format)
                                          - `SEARXNG_URL=http://searxng:8080`
                                          - `TAVILY_API_KEY` (shared across GPTR, Morphic, gptr-mcp)
                                          - `BRAVE_API_KEY` (shared across GPTR, Morphic)
                                          - `EXA_API_KEY` (shared across GPTR, Morphic, gptr-mcp)

                                          Note: Deduplicate all API key env vars across sections — each key should appear once in 
                                          `.env.example` with a comment noting which services share it.

                                          ---

### Port Allocation Summary (add to docs/ARCHITECTURE.md or create it)

| Service | Internal Port | Notes |
|---|---|---|
| Multica API | 8080 | Go backend |
| Multica Web | 3000 | Next.js |
| GPTR Backend | 8000 | FastAPI |
| GPTR Frontend | 3001 | Next.js (mapped from default 3000) |
| gptr-mcp | 4000 | MCP server |
| Morphic | 3002 | Next.js generative search UI |
| SearXNG | 8888 | (use 8888 to avoid conflict with GPTR on 8000) |
| Scrapling | 5000 | scraping service |
| Postgres (Multica) | 5432 | pgvector instance |
| Prometheus metrics | 9090 | internal only, 127.0.0.1 |

### Constraints for This Pass
- Do NOT reconfigure Memory Palace (that is a separate task)
- Do NOT implement Scrapling scraping logic — only add the submodule, service stub, and MCP tool registration
- Flag any port conflicts found in the existing docker-compose.yml
- Create `docs/ARCHITECTURE.md` if it does not exist, with the port table and a 
  plain-English description of each service layer
  - Commit each file change separately with descriptive messages
  - Report back with: list of all files changed, any port conflicts found, any missing 
    env vars you could not determine values for, and any ambiguities requiring human decision
    ```

## MORPHIC SEARCH FALLBACK CONFIGURATION

Configure Morphic with the following search provider priority and fallback logic:

**Primary:** SearXNG (internal instance at http://searxng:8888)  
**Automatic fallback order when SearXNG returns < 5 results or times out:**
1. Tavily (structured web search, best for legal/news)
2. Brave (independent index, good for privacy-respecting broad search)
3. Exa (semantic/neural search, best for research papers, case law, academic sources)

In Morphic's provider configuration:
- Set `SEARXNG_API_URL=http://searxng:8888` as the default provider
- Set fallback threshold: if SearXNG result count < 5 OR response time > 8s, 
  automatically chain to Tavily → Brave → Exa in sequence until result count ≥ 5
  - All fallback API calls must be logged (provider name, query, result count) to the 
    Multica audit trail via Sol's MCP integration so human reviewers can see which 
      queries leaked to external APIs
      - Add `MORPHIC_FALLBACK_ENABLED=true` and `MORPHIC_FALLBACK_THRESHOLD=5` to 
        `.env.example` under `## MORPHIC` so this behavior can be disabled for 
          maximum-privacy runs

          For GPTR retriever configuration, apply the same priority: set 
          `RETRIEVER=searxng,tavily,brave,exa` so GPTR's multi-retriever cycles through 
          the same stack in the same order.

          Scrapling is NOT part of the Morphic fallback chain — it is invoked explicitly 
          by agents via the `scrapling_fetch` MCP tool for specific URLs, not as a 
          general search backend.
