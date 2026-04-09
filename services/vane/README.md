# Vane — Operator Search Interface

> Human-facing research workspace for ZHC Firm operators.

## Overview
Vane is a Perplexity-style conversational research interface that provides operators with:
- Ad-hoc web Q&A over the private SearXNG instance
- Document upload and Q&A (Tier-2/3 material only)
- Multi-mode research depth: Speed / Balanced / Quality
- Image and video search
- Domain- and topic-scoped search sessions
- Search history and session management
- Output export to Open Notebook

## Key Features
- **Cited web Q&A**: All responses include source citations
- **Multi-source synthesis**: Cross-references results from multiple engines
- **Document Q&A**: Upload PDFs, TXT, DOCX for context-aware answers
- **Session persistence**: Save and resume research sessions
- **Output to Open Notebook**: Export findings for further processing

## Security Note
⚠️ **Vane’s file upload feature must NOT be used with Tier-0 or Tier-1 material.**
- Only Tier-2 and Tier-3 de-identified or public-approved content should be uploaded.
- Upstream authentication and role-based access control are required before Tier-0/1 use.

## Access
- **Facing**: Internal (Human-facing only)
- **Search tier**: T4 — admin
- **HITL gates**: N/A — operated directly by humans
- **Systems accessed**:
  - SearXNG (T4-admin via SEARXNG_API_URL) — Full access to all engine groups
  - Ollama / local LLM — Inference for Q&A and synthesis
  - Open Notebook — Write only (research output export)

## Configuration
See `vane.yaml` for runtime settings.
