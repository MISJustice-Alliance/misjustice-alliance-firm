# LawGlance — Deployment Setup Guide

> **Scope:** Self-hosted Docker Compose deployment of the MISJustice LawGlance RAG service.  
> **Audience:** MISJustice Alliance platform operators and DevOps.  
> **Prerequisite reading:** [`services/lawglance/README.md`](./README.md) — corpus extension,  
> chain customization, and data boundary policy.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Network Isolation Model](#2-network-isolation-model)
3. [Docker Compose Service Definition](#3-docker-compose-service-definition)
4. [Environment Files and Secrets](#4-environment-files-and-secrets)
5. [First-Run Startup Sequence](#5-first-run-startup-sequence)
6. [Corpus Ingestion on First Deploy](#6-corpus-ingestion-on-first-deploy)
7. [AgenticMail Webhook Integration](#7-agenticmail-webhook-integration)
8. [Health Checks and Monitoring](#8-health-checks-and-monitoring)
9. [Corpus Refresh Runbook](#9-corpus-refresh-runbook)
10. [Data Boundary Pre-Flight Checklist](#10-data-boundary-pre-flight-checklist)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Docker Engine | ≥ 26.x | |
| Docker Compose | ≥ v2.24 | `docker compose` (v2 plugin syntax) |
| Ollama | ≥ 0.3.x | Running as a separate service or sidecar; see §3 |
| Python | 3.11+ | For corpus ingestion script only |
| uv | ≥ 0.4.x | Package manager used by upstream LawGlance |
| Disk | ≥ 30 GB free | ChromaDB PV + model weights (llama3.1:8b ≈ 4.7 GB) |
| RAM | ≥ 16 GB | 8 GB for Ollama + 4 GB for LawGlance service |

LawGlance must **not** be deployed on the same Docker network as MCAS or OpenRAG.
See §2 for the required network isolation topology.

---

## 2. Network Isolation Model

The MISJustice Docker Compose stack uses **named bridge networks** to enforce service
isolation. LawGlance sits on its own `lawglance-net` network, reachable only by the
agent services that are authorized to call it (Rae, Lex, Citation Agent).

```
                       ┌──────────────────────────────┐
                       │     lawglance-net              │
┌──────────────┐     │   ┌─────────────────┐  │
│ agent-net      │───▶│   │ lawglance:8501  │  │
│ (rae, lex,     │     │   └─────────────────┘  │
│  citation)     │     │   ┌─────────────────┐  │
└──────────────┘     │   │ redis:6379      │  │
                       │   └─────────────────┘  │
┌──────────────┐     │   ┌─────────────────┐  │
│ internal-net   │  ✗  │   │ ollama:11434    │  │
│ (mcas, openrag,│     │   └─────────────────┘  │
│  litellm, vane) │     └──────────────────────────────┘
└──────────────┘
  ✗ = no route between internal-net and lawglance-net
```

**Rules enforced by network assignment:**
- MCAS, OpenRAG, LiteLLM, Vane, and AgenticMail are on `internal-net` only.
- LawGlance, its Redis instance, and Ollama are on `lawglance-net` only.
- Rae, Lex, and Citation Agent containers are attached to **both** `agent-net`
  and `lawglance-net`, giving them the only cross-network path to LawGlance.
- No container in `internal-net` has a route to `lawglance-net`.

---

## 3. Docker Compose Service Definition

Add the following to `infra/docker/docker-compose.yml` (or to a dedicated
`docker-compose.lawglance.yml` and merge with `-f` flag).

```yaml
# infra/docker/docker-compose.lawglance.yml
# Merge command:
#   docker compose -f docker-compose.yml -f docker-compose.lawglance.yml up -d

networks:
  lawglance-net:
    driver: bridge
    internal: true          # no outbound internet access from this network
    name: misjustice-lawglance-net
  agent-net:
    external: true          # created by the main docker-compose.yml
    name: misjustice-agent-net

volumes:
  lawglance-chroma-data:
    driver: local
  lawglance-redis-data:
    driver: local
  ollama-models:
    driver: local

secrets:
  openai_api_key:
    file: ./secrets/openai_api_key.txt   # omit if LLM_BACKEND=ollama

services:

  # ── Ollama (local LLM inference) ─────────────────────────────────────────
  ollama:
    image: ollama/ollama:latest
    container_name: misjustice-ollama
    restart: unless-stopped
    networks:
      - lawglance-net
    volumes:
      - ollama-models:/root/.ollama
    environment:
      OLLAMA_HOST: 0.0.0.0
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia          # remove if no GPU; CPU inference will be slower
              count: 1
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

  # ── Redis (session cache + query cache for LawGlance) ────────────────────
  lawglance-redis:
    image: redis:7-alpine
    container_name: misjustice-lawglance-redis
    restart: unless-stopped
    networks:
      - lawglance-net
    volumes:
      - lawglance-redis-data:/data
    command: >
      redis-server
      --save 60 1
      --loglevel warning
      --requirepass "${REDIS_PASSWORD}"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 15s
      timeout: 5s
      retries: 3

  # ── LawGlance ─────────────────────────────────────────────────────────────
  lawglance:
    image: python:3.11-slim
    container_name: misjustice-lawglance
    restart: unless-stopped
    working_dir: /app
    networks:
      - lawglance-net
      # NOTE: Do NOT add internal-net here.
      # Agent containers (rae, lex, citation) are dual-homed on agent-net + lawglance-net.
    volumes:
      - ./../../services/lawglance:/app          # bind-mount service source
      - lawglance-chroma-data:/data/chroma_db_misjustice
    env_file:
      - ./../../services/lawglance/.env
    environment:
      CHROMA_PATH: /data/chroma_db_misjustice
      REDIS_URL: redis://:${REDIS_PASSWORD}@lawglance-redis:6379/0
      OLLAMA_BASE_URL: http://ollama:11434
      LLM_BACKEND: ollama
      OLLAMA_MODEL: llama3.1:8b
      OLLAMA_EMBED_MODEL: nomic-embed-text
      LLM_TEMPERATURE: "0.1"
      LAWGLANCE_PORT: "8501"
      LOG_LEVEL: INFO
    # secrets:
    #   - openai_api_key   # uncomment only if LLM_BACKEND=openai
    command: >
      bash -c "
        pip install uv --quiet &&
        uv pip install --system -r requirements.txt --quiet &&
        pip install langchain-ollama --quiet &&
        python -m uvicorn misjustice_api:app
          --host 0.0.0.0
          --port 8501
          --log-level info
      "
    depends_on:
      ollama:
        condition: service_healthy
      lawglance-redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:8501/health"]
      interval: 20s
      timeout: 10s
      retries: 5
      start_period: 90s
    ports: []   # no host-port exposure; accessible only via agent-net / lawglance-net
```

> **Port exposure:** LawGlance exposes **no host port**. It is reachable only from
> containers on `lawglance-net` (i.e., `rae`, `lex`, `citation-agent`, and the
> ingestion utility container). This is intentional. If you need a debug interface,
> use `docker compose exec lawglance curl http://localhost:8501/health` from the host.

---

## 4. Environment Files and Secrets

### 4.1 `.env` for the LawGlance service

Create `services/lawglance/.env` from the example:

```bash
cp services/lawglance/lawglance.env.example services/lawglance/.env
```

Minimum fields to populate before first run:

```bash
# Required regardless of LLM backend
REDIS_PASSWORD=<generate with: openssl rand -hex 32>
CHROMA_PATH=/data/chroma_db_misjustice

# Ollama backend (recommended for full on-premises privacy)
LLM_BACKEND=ollama
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBED_MODEL=nomic-embed-text
LLM_TEMPERATURE=0.1

# Only if LLM_BACKEND=openai
# OPENAI_API_KEY=<your key>
# OPENAI_MODEL=gpt-4o-mini
# OPENAI_EMBED_MODEL=text-embedding-3-small

# AgenticMail webhook (see §7)
AGENTICMAIL_WEBHOOK_URL=http://agenticmail:9000/webhooks/lawglance
AGENTICMAIL_WEBHOOK_SECRET=<generate with: openssl rand -hex 32>
```

### 4.2 Docker Secrets (production)

For production deployments, use Docker Secrets instead of env file for sensitive values:

```bash
# Create secret files (never commit these)
mkdir -p infra/docker/secrets
echo "<your-redis-password>" > infra/docker/secrets/redis_password.txt
echo "<your-openai-key>"    > infra/docker/secrets/openai_api_key.txt
echo "<your-webhook-secret>" > infra/docker/secrets/agenticmail_webhook_secret.txt

# Secure the secrets directory
chmod 700 infra/docker/secrets
chmod 600 infra/docker/secrets/*.txt

# Add to .gitignore
echo 'infra/docker/secrets/' >> .gitignore
```

---

## 5. First-Run Startup Sequence

Follow this order strictly. Starting LawGlance before Ollama has pulled models will
cause chain initialization to fail.

```bash
# Step 1: Start Ollama and pull required models
docker compose -f infra/docker/docker-compose.lawglance.yml up -d ollama

# Wait for Ollama to be healthy (~30s)
docker compose -f infra/docker/docker-compose.lawglance.yml \
  exec ollama ollama pull llama3.1:8b

docker compose -f infra/docker/docker-compose.lawglance.yml \
  exec ollama ollama pull nomic-embed-text

# Verify models are available
docker compose -f infra/docker/docker-compose.lawglance.yml \
  exec ollama ollama list

# Step 2: Start Redis
docker compose -f infra/docker/docker-compose.lawglance.yml up -d lawglance-redis

# Verify Redis is healthy
docker compose -f infra/docker/docker-compose.lawglance.yml \
  exec lawglance-redis redis-cli -a "${REDIS_PASSWORD}" ping
# Expected output: PONG

# Step 3: Run corpus ingestion BEFORE starting LawGlance
# (ChromaDB collections must exist before the API starts)
# See §6 for the full ingestion procedure.

# Step 4: Start LawGlance
docker compose -f infra/docker/docker-compose.lawglance.yml up -d lawglance

# Step 5: Confirm healthy
docker compose -f infra/docker/docker-compose.lawglance.yml ps
# All three services should show status: healthy

# Step 6: Smoke test from a dev container on agent-net
docker run --rm --network misjustice-agent-net curlimages/curl:latest \
  curl -sf http://lawglance:8501/health
# Expected: {"status": "ok", "collections": [...], "llm_backend": "ollama"}
```

---

## 6. Corpus Ingestion on First Deploy

Corpus ingestion runs in a one-shot utility container. It does **not** require the
LawGlance API service to be running and must complete before the API starts.

```bash
# Run ingestion for each jurisdiction collection
# (repeat for all four: us_federal, montana, washington, us_civil_rights)

docker run --rm \
  --network misjustice-lawglance-net \
  -v "$(pwd)/services/lawglance:/app" \
  -v lawglance-chroma-data:/data/chroma_db_misjustice \
  -e CHROMA_PATH=/data/chroma_db_misjustice \
  -e LLM_BACKEND=ollama \
  -e OLLAMA_BASE_URL=http://ollama:11434 \
  -e OLLAMA_EMBED_MODEL=nomic-embed-text \
  python:3.11-slim \
  bash -c "
    pip install uv --quiet &&
    uv pip install --system -r /app/requirements.txt --quiet &&
    pip install langchain-ollama --quiet &&
    python /app/corpus/ingest.py \
      --collection montana \
      --source_dir /app/corpus/montana/raw
  "

# Verify collections are populated
docker run --rm \
  --network misjustice-lawglance-net \
  -v lawglance-chroma-data:/data/chroma_db_misjustice \
  -e CHROMA_PATH=/data/chroma_db_misjustice \
  python:3.11-slim \
  bash -c "
    pip install chromadb --quiet &&
    python -c \"
      import chromadb
      client = chromadb.PersistentClient(path='/data/chroma_db_misjustice')
      for col in client.list_collections():
          print(col.name, col.count(), 'chunks')
    \"
  "
```

**Expected output (after all four collections ingested):**
```
misjustice_us_federal     4200 chunks
misjustice_montana        2800 chunks
misjustice_washington     3100 chunks
misjustice_civil_rights   1600 chunks
```

> Chunk counts will vary with your source document set. Any non-zero count indicates
> successful ingestion. If a collection shows 0 chunks, check that `corpus/*/raw/`
> contains at least one `.pdf` or `.txt` file.

---

## 7. AgenticMail Webhook Integration

### Role of AgenticMail in this context

AgenticMail in the MISJustice stack is the **approval-queue and outreach email
infrastructure** used by Ollie (Outreach Coordinator) and the broader agent platform.
It operates on `internal-net` and is **not** a legal research tool — it must not
query LawGlance directly.

However, AgenticMail is the correct delivery channel for two operator notifications
related to LawGlance operations:

1. **Corpus-update approval requests** — when new source documents have been staged in
   `corpus/*/raw/` and are pending operator approval before ingestion.
2. **Service health alerts** — when the LawGlance health check fails for >3 consecutive
   intervals.

These notifications flow **out of** LawGlance **to** AgenticMail via a webhook —
not the reverse. AgenticMail never sends queries into LawGlance.

### 7.1 Webhook sender (LawGlance side)

Add `services/lawglance/agenticmail_notify.py`:

```python
# services/lawglance/agenticmail_notify.py
"""
LawGlance → AgenticMail outbound webhook sender.
Sends operator notifications for corpus-update approvals and health alerts.
This is a one-way outbound channel only — AgenticMail never queries LawGlance.
"""

import os
import hmac
import hashlib
import json
import time
import logging
import urllib.request
import urllib.error

logger = logging.getLogger("lawglance.notify")

WEBHOOK_URL    = os.getenv("AGENTICMAIL_WEBHOOK_URL", "")
WEBHOOK_SECRET = os.getenv("AGENTICMAIL_WEBHOOK_SECRET", "").encode()


def _sign_payload(payload_bytes: bytes) -> str:
    """HMAC-SHA256 signature for webhook authenticity."""
    return hmac.new(WEBHOOK_SECRET, payload_bytes, hashlib.sha256).hexdigest()


def send_notification(event_type: str, data: dict, require_approval: bool = False) -> bool:
    """
    Send a notification to AgenticMail.

    event_type:       "corpus_update_staged" | "health_alert" | "corpus_ingested"
    data:             dict of event-specific fields (no PII, no case data)
    require_approval: if True, AgenticMail routes this to the human approval queue

    Returns True on success, False on failure.
    """
    if not WEBHOOK_URL:
        logger.warning("[notify] AGENTICMAIL_WEBHOOK_URL not set; notification suppressed.")
        return False

    payload = {
        "source":           "lawglance",
        "event_type":       event_type,
        "timestamp":        int(time.time()),
        "require_approval": require_approval,
        "data":             data,
    }
    payload_bytes = json.dumps(payload).encode("utf-8")
    signature    = _sign_payload(payload_bytes)

    req = urllib.request.Request(
        WEBHOOK_URL,
        data=payload_bytes,
        headers={
            "Content-Type":       "application/json",
            "X-LawGlance-Event":  event_type,
            "X-Signature-SHA256": f"sha256={signature}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            logger.info(f"[notify] Sent {event_type} → AgenticMail | HTTP {resp.status}")
            return resp.status in (200, 201, 202, 204)
    except urllib.error.URLError as e:
        logger.error(f"[notify] Failed to send {event_type} to AgenticMail: {e}")
        return False


# --- Convenience helpers ---

def notify_corpus_staged(collection: str, file_count: int, staged_by: str = "operator"):
    """Notify operator that new corpus files are staged and awaiting approval."""
    return send_notification(
        event_type="corpus_update_staged",
        data={
            "collection":  collection,
            "file_count":  file_count,
            "staged_by":   staged_by,
            "action":      "Run corpus ingestion after operator review.",
            "command":     f"See: services/lawglance/SETUP.md §9 (Corpus Refresh Runbook)",
        },
        require_approval=True,
    )


def notify_corpus_ingested(collection: str, chunk_count: int):
    """Confirm successful corpus ingestion — informational, no approval required."""
    return send_notification(
        event_type="corpus_ingested",
        data={
            "collection":  collection,
            "chunk_count": chunk_count,
            "status":      "success",
        },
        require_approval=False,
    )


def notify_health_alert(consecutive_failures: int, last_error: str):
    """Alert operator of repeated health check failures."""
    return send_notification(
        event_type="health_alert",
        data={
            "service":              "lawglance",
            "consecutive_failures": consecutive_failures,
            "last_error":           last_error[:200],  # truncate; no PII
            "action":               "Check: docker compose logs misjustice-lawglance",
        },
        require_approval=False,
    )
```

### 7.2 AgenticMail webhook receiver (AgenticMail side)

Register the LawGlance webhook in your AgenticMail configuration:

```yaml
# services/agenticmail/config.yaml (excerpt)
webhooks:
  inbound:
    - path: /webhooks/lawglance
      source: lawglance
      secret_env: AGENTICMAIL_WEBHOOK_SECRET_LAWGLANCE
      verify_signature: true
      signature_header: X-Signature-SHA256
      routing:
        corpus_update_staged:
          queue: operator-approval
          subject: "[LawGlance] Corpus update staged — approval required"
          to: operator          # routes to operator Telegram/email via AgenticMail
          priority: normal
        health_alert:
          queue: ops-alerts
          subject: "[LawGlance] Service health alert"
          to: operator
          priority: high
        corpus_ingested:
          queue: ops-info
          subject: "[LawGlance] Corpus ingestion complete"
          to: operator
          priority: low
```

**Data boundary note:** The webhook payload contains only operational metadata
(collection name, chunk count, timestamp, error message snippets). It never
contains query content, answer text, agent session IDs, or any case-related data.
Verify this is enforced in `send_notification()` before wiring to AgenticMail.

### 7.3 Network path for webhook delivery

The webhook is sent from the `lawglance` container to the `agenticmail` container.
Because these services are on different networks (`lawglance-net` vs `internal-net`),
this requires a **gateway container or a shared notification-net**:

```yaml
# Add to docker-compose.lawglance.yml
networks:
  notification-net:
    external: true
    name: misjustice-notification-net   # shared with agenticmail

services:
  lawglance:
    networks:
      - lawglance-net
      - notification-net   # outbound-only path to AgenticMail webhook
    # Still NOT on internal-net or agent-net
```

The `notification-net` carries **only outbound webhook POST requests** from LawGlance
to AgenticMail. No query traffic ever flows in the reverse direction.

---

## 8. Health Checks and Monitoring

### 8.1 Health endpoint

Add `services/lawglance/misjustice_api.py` to expose a health endpoint alongside
the query API:

```python
# services/lawglance/misjustice_api.py
"""
FastAPI wrapper around misjustice_adapter.lawglance_query().
Exposes /health and /query endpoints for agent tool calls.
"""

import os
import logging
from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional

import chromadb
from misjustice_adapter import lawglance_query
from agenticmail_notify import notify_health_alert

app    = FastAPI(title="MISJustice LawGlance", version="1.0.0")
logger = logging.getLogger("lawglance.api")

_consecutive_health_failures = 0

# ── Auth: simple bearer token (set LAWGLANCE_API_TOKEN in env) ───────────
API_TOKEN = os.getenv("LAWGLANCE_API_TOKEN", "")

def verify_token(authorization: str = Header(...)):
    if not API_TOKEN:
        return  # token auth disabled (dev mode)
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or token != API_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

# ── Models ────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query:        str
    jurisdiction: str  = "all"
    agent_id:     str  = "default"
    session_id:   str  = "default-session"

class QueryResponse(BaseModel):
    answer:  str
    sources: list
    cached:  bool

# ── Routes ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    global _consecutive_health_failures
    chroma_path = os.getenv("CHROMA_PATH", "./chroma_db_misjustice")
    try:
        client      = chromadb.PersistentClient(path=chroma_path)
        collections = [c.name for c in client.list_collections()]
        _consecutive_health_failures = 0
        return {
            "status":      "ok",
            "collections": collections,
            "llm_backend": os.getenv("LLM_BACKEND", "openai"),
        }
    except Exception as e:
        _consecutive_health_failures += 1
        logger.error(f"[health] ChromaDB check failed: {e}")
        if _consecutive_health_failures >= 3:
            notify_health_alert(_consecutive_health_failures, str(e))
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/query", response_model=QueryResponse)
def query(
    req:   QueryRequest,
    _auth: None = Depends(verify_token),
):
    try:
        result = lawglance_query(
            query=req.query,
            jurisdiction=req.jurisdiction,
            agent_id=req.agent_id,
            session_id=req.session_id,
        )
        return QueryResponse(**result)
    except ValueError as e:
        # PII guard rejection
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"[query] Unhandled error: {e}")
        raise HTTPException(status_code=500, detail="Internal retrieval error")
```

### 8.2 Monitoring integration

The health endpoint is polled by Docker Compose (see §3). For additional monitoring,
add a Prometheus scrape or Uptime Kuma probe targeting `http://lawglance:8501/health`
from the `lawglance-net`. Do not expose this endpoint on the host or `internal-net`.

---

## 9. Corpus Refresh Runbook

Run this procedure whenever new source documents are added to a corpus collection.

```bash
# 1. Stage new source files
cp /path/to/new/statutes.pdf \
   services/lawglance/corpus/montana/raw/

# 2. Notify operator via AgenticMail (requires approval before ingestion)
python - <<'EOF'
from agenticmail_notify import notify_corpus_staged
notify_corpus_staged(collection="montana", file_count=3, staged_by="operator")
EOF
# Operator receives an approval notification via AgenticMail.
# Do NOT proceed to step 3 until approval is confirmed.

# 3. After approval: flush the Redis cache for this tier
docker compose exec lawglance-redis \
  redis-cli -a "${REDIS_PASSWORD}" KEYS 'misjustice:t1:*' \
  | xargs docker compose exec -T lawglance-redis \
    redis-cli -a "${REDIS_PASSWORD}" DEL

# 4. Run ingestion (one-shot container)
docker run --rm \
  --network misjustice-lawglance-net \
  -v "$(pwd)/services/lawglance:/app" \
  -v lawglance-chroma-data:/data/chroma_db_misjustice \
  -e CHROMA_PATH=/data/chroma_db_misjustice \
  -e OLLAMA_BASE_URL=http://ollama:11434 \
  -e OLLAMA_EMBED_MODEL=nomic-embed-text \
  -e LLM_BACKEND=ollama \
  python:3.11-slim \
  bash -c "
    pip install uv --quiet &&
    uv pip install --system -r /app/requirements.txt --quiet &&
    pip install langchain-ollama --quiet &&
    python /app/corpus/ingest.py \
      --collection montana \
      --source_dir /app/corpus/montana/raw
  "

# 5. Restart LawGlance to reload ChromaDB client
docker compose restart lawglance

# 6. Verify health
docker compose exec lawglance curl -sf http://localhost:8501/health | python -m json.tool

# 7. Send completion notification
python - <<'EOF'
from agenticmail_notify import notify_corpus_ingested
notify_corpus_ingested(collection="montana", chunk_count=2800)
EOF
```

---

## 10. Data Boundary Pre-Flight Checklist

Complete this checklist before starting the LawGlance service for the first time
and after any significant configuration change.

- [ ] `lawglance-net` is defined as `internal: true` in Docker Compose (no outbound internet from LawGlance containers)
- [ ] LawGlance container is **not** connected to `internal-net` (where MCAS and OpenRAG live)
- [ ] `corpus/*/raw/` directories contain **only** public statutory / case law documents — no MCAS exports, intakes, or case materials
- [ ] `AGENTICMAIL_WEBHOOK_URL` points to the AgenticMail `/webhooks/lawglance` endpoint, not to any MCAS or OpenRAG endpoint
- [ ] `LAWGLANCE_API_TOKEN` is set and matches the value configured in Rae, Lex, and Citation Agent tool configs
- [ ] Redis password (`REDIS_PASSWORD`) is a unique value not shared with MCAS Redis or any other service
- [ ] Ollama models are pulled and confirmed with `ollama list` before LawGlance starts
- [ ] ChromaDB PVC / volume is **not** shared with OpenRAG
- [ ] Webhook payload from `agenticmail_notify.py` has been reviewed — confirm it contains no query content, session IDs, or case-related data
- [ ] `secrets/` directory is in `.gitignore`
- [ ] No host port is exposed for the LawGlance container (the `ports:` key in docker-compose.lawglance.yml must be empty or absent)

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `lawglance` container exits immediately | `requirements.txt` install failure or Ollama not yet healthy | Check logs: `docker compose logs lawglance`; confirm Ollama is healthy first |
| `/health` returns 503 | ChromaDB collections not yet ingested | Run §6 ingestion before starting the API |
| `/query` returns 422 | PII guard rejected the query | Rephrase query as an abstract legal question; remove names, docket numbers |
| `/query` returns empty `sources` | Score threshold too high (no chunks above 0.3) | Lower `score_threshold` in `misjustice_vector_store.py` to 0.2 and restart |
| Redis `PONG` timeout | Redis password mismatch between `REDIS_PASSWORD` env vars | Confirm `lawglance/.env` and Docker Compose env use the same value |
| Ollama inference timeout | Model not pulled or insufficient RAM | `docker compose exec ollama ollama list`; pull model if missing |
| AgenticMail webhook returns 401 | Signature mismatch | Confirm `AGENTICMAIL_WEBHOOK_SECRET` matches on both sides |
| Agent can't reach `lawglance:8501` | Agent container not on `lawglance-net` | Add `lawglance-net` to the agent container's `networks:` in docker-compose |

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
