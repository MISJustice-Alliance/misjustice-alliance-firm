---
title: Multi-Provider Inference Architecture
created: 2026-04-29
updated: 2026-04-29
type: concept
tags: [infrastructure, api, deployment, automation]
sources: [raw/articles/infra-litellm-providers.md]
confidence: high
---

# Multi-Provider Inference Architecture

## Overview

The MISJustice Alliance Firm routes LLM requests through a **LiteLLM proxy** configured with model groups. Each group is a logical name that maps to multiple physical backends, enabling load balancing, automatic failover, and task-based routing across cloud and local providers.^[raw/articles/infra-litellm-providers.md]

## Model Groups

| Group | Backends | Use Case |
|---|---|---|
| `default` | Ollama local → OpenRouter GPT-4o-mini → OpenAI GPT-4o | General-purpose |
| `fast` | OpenRouter GPT-4o-mini → Venice Llama-3.3-70b → OpenAI GPT-4o-mini | Low-latency, cheap |
| `reasoning` | Anthropic Claude Sonnet → Gemini Pro → OpenAI GPT-4o → Venice DeepSeek | Complex analysis |
| `coding` | OpenAI o3-mini → Anthropic Claude Sonnet → OpenRouter GPT-4o → Moonshot Kimi K2.5 | Code generation |
| `local-only` | Ollama llama3.2 only | Privacy-first, no cloud |
| `local-embeddings` | Ollama nomic-embed-text | Vector embeddings |

## Fallback Behavior

If a provider in a group fails, the proxy retries the next provider in that group. If all providers in a group fail, it falls back through a cross-group chain:

- `local-only` → `default` → `fast` → `reasoning`
- `default` → `fast` → `reasoning` → `coding`
- `fast` → `default` → `reasoning` → `coding`
- `reasoning` → `coding` → `default` → `fast`
- `coding` → `reasoning` → `default` → `fast`

## Agent Routing

Agents declare their preference in `agents/<name>/models.yaml` via `provider_hint`:

```yaml
models:
  primary:
    provider_hint: reasoning
    temperature: 0.1
```

Supported hints: `default`, `fast`, `reasoning`, `coding`, `local`, `local-only`, `privacy`.

## Provider API Keys

Cloud providers require real API keys in `.env`:

- [[openai-api-key]] — `OPENAI_API_KEY`
- [[anthropic-api-key]] — `ANTHROPIC_API_KEY`
- [[gemini-api-key]] — `GEMINI_API_KEY`
- [[openrouter-api-key]] — `OPENROUTER_API_KEY`
- [[venice-api-key]] — `VENICE_API_KEY`
- [[moonshot-api-key]] — `MOONSHOT_API_KEY`
- [[kimi-api-key]] — `KIMI_API_KEY`

Empty keys are safe — LiteLLM skips missing providers gracefully.^[raw/articles/infra-litellm-providers.md]

## Provider Health Status

| Provider | Key Present | Status | Last Verified | Notes |
|---|---|---|---|---|
| **Venice.ai** | ✓ | ✅ Operational | 2026-04-29 | Credits added; `llama-3.3-70b` responding 200 OK |
| **OpenRouter** | ✓ | ⚠️ Guardrailed | 2026-04-29 | 404 — privacy/data-policy restrictions blocking endpoints |
| **Kimi (Moonshot)** | ✓ | ❌ Invalid Key | 2026-04-29 | 401 Invalid Authentication — key may be revoked or expired |
| **OpenAI** | — | 🔴 Not Configured | — | Key empty in `.env`; skipped by LiteLLM |
| **Anthropic** | — | 🔴 Not Configured | — | Key empty in `.env`; skipped by LiteLLM |
| **Gemini** | — | 🔴 Not Configured | — | Key empty in `.env`; skipped by LiteLLM |

### Recovery Actions

- **Venice** — Ready for inference. Use for `fast` and `reasoning` model groups. Direct model calls (`openai/llama-3.3-70b`) work through LiteLLM proxy; group routing falls back to Ollama when OpenRouter/OpenAI fail ahead of Venice in the shuffle.
- **OpenRouter** — Visit `https://openrouter.ai/settings/privacy` to disable restrictive guardrails.
- **Kimi** — Replace `KIMI_API_KEY` in `.env` with a valid key from `https://platform.moonshot.cn/`. Note: Kimi Coding endpoint (`api.kimi.com/coding/v1`) restricts usage to approved coding agents only.

## LiteLLM Proxy Test Results (2026-04-29)

| Test | Result | Details |
|---|---|---|
| Venice direct via proxy | ✅ 200 OK | `openai/llama-3.3-70b` responds in ~3s |
| `fast` group routing | ⚠️ Falls back to Ollama | `simple-shuffle` picks OpenRouter first (404), falls back to `default` (Ollama) before retrying Venice |
| `local-only` group | ✅ 200 OK | Ollama `llama3.2:1b` healthy |
| OpenRouter via proxy | ❌ 404 | Privacy guardrails block all endpoints |
| Kimi via proxy | ❌ 403 | `access_terminated_error` — coding endpoint restricted to approved agents |

**Action:** To use Venice reliably through model groups, either (a) reorder `fast` group so Venice is first, or (b) switch routing strategy to `least-busy` with retries per provider.

Kimi Code uses a separate endpoint (`https://api.kimi.com/coding/v1`) from the general Moonshot platform (`https://api.moonshot.cn/v1`). Both keys are optional; configure whichever you have access to.^[raw/articles/infra-litellm-providers.md]

## Related

- [[mcas-case-management]] — Case management system that consumes these model groups
- [[litellm-proxy]] — Proxy configuration and deployment
- [[agent-orchestration-workflow]] — How agents request model groups during task execution
