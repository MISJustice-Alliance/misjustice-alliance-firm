---
source_url: file:///home/elvis/projects/misjustice-alliance-firm/infra/litellm/PROVIDERS.md
ingested: 2026-04-29
sha256: 8a4f3c2e1d0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4
---

# Multi-Provider Inference Architecture

## Overview

The LiteLLM proxy is configured with **model groups** — logical names that map to
multiple physical backends. This enables:

- **Load balancing**: Requests distributed across providers in a group
- **Automatic failover**: If one provider fails, retry another in the group
- **Cross-group fallback**: If ALL providers in a group fail, fall back to other groups
- **Task-based routing**: Agents request `reasoning`, `coding`, `fast`, etc.

## Model Groups

| Group | Backends | Use Case |
|---|---|---|
| `default` | Ollama local → OpenRouter GPT-4o-mini → OpenAI GPT-4o | General-purpose |
| `fast` | OpenRouter GPT-4o-mini → Venice Llama-3.3-70b → OpenAI GPT-4o-mini | Low-latency, cheap |
| `reasoning` | Anthropic Claude Sonnet → Gemini Pro → OpenAI GPT-4o → Venice DeepSeek | Complex analysis |
| `coding` | OpenAI o3-mini → Anthropic Claude Sonnet → OpenRouter GPT-4o → Moonshot Kimi K2.5 | Code generation |
| `local-only` | Ollama llama3.2 only | Privacy-first, no cloud |
| `local-embeddings` | Ollama nomic-embed-text | Vector embeddings |

## Fallback Chain

```
local-only → default → fast → reasoning
    default → fast → reasoning → coding
       fast → default → reasoning → coding
  reasoning → coding → default → fast
     coding → reasoning → default → fast
```

## Enabling Cloud Providers

Add real API keys to `/home/elvis/projects/misjustice-alliance-firm/.env`:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
OPENROUTER_API_KEY=sk-or-...
VENICE_API_KEY=...
MOONSHOT_API_KEY=sk-...   # https://platform.moonshot.cn (general Kimi API)
KIMI_API_KEY=sk-...       # https://www.kimi.com/code/console (Kimi Code coding API)
```

> **Note:** Kimi Code uses a separate API endpoint (`https://api.kimi.com/coding/v1`) from the general Moonshot platform (`https://api.moonshot.cn/v1`). Both keys are optional — configure whichever you have access to.

Then recreate the proxy:
```bash
docker compose rm -f litellm-proxy
docker compose up -d litellm-proxy
```

Empty keys are safe — LiteLLM skips providers gracefully.

## Agent-Level Routing

Agents declare their provider preference in `agents/<name>/models.yaml`:

```yaml
models:
  primary:
    provider_hint: reasoning   # Maps to LiteLLM "reasoning" group
    temperature: 0.1
```

Supported hints: `default`, `fast`, `reasoning`, `coding`, `local`, `local-only`, `privacy`

## Testing

```bash
# List available model groups
curl -s http://localhost:4000/v1/models \
  -H "Authorization: Bearer sk-local-dev"

# Chat via default group (tries local → cloud fallback)
curl -s -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-local-dev" \
  -H "Content-Type: application/json" \
  -d '{"model":"default","messages":[{"role":"user","content":"hello"}]}'

# Chat via reasoning group
curl -s -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-local-dev" \
  -H "Content-Type: application/json" \
  -d '{"model":"reasoning","messages":[{"role":"user","content":"analyze this"}]}'
```

## Files Changed

- `infra/litellm/config.yaml` — Multi-provider config with fallbacks
- `.env` — Provider API key placeholders
- `docker-compose.yml` — Env var injection into litellm-proxy
- `crewai-orchestrator/src/misjustice_crews/config/settings.py` — Model alias settings
- `crewai-orchestrator/src/misjustice_crews/agents/factory.py` — Provider-hint resolution
