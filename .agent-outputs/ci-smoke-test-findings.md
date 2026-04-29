# CI Smoke Test Investigation Findings

## Investigator
Agent: qa-tester (kimi CLI v1.39.0)
Date: 2026-04-28
Task: Verify CI smoke test assertion in `.github/workflows/ci.yml`

## Files Examined
- `.github/workflows/ci.yml` lines 165-185
- `services/mcas/app/main.py` lines 30-40
- `services/mcas/Dockerfile`
- `services/mcas/docker-compose.yml`

## CI Smoke Test (Current)
```yaml
run: |
  curl -fsS http://localhost:8001/health | grep -q ok
```

## Endpoint Verification
- `services/mcas/app/main.py` defines `@app.get("/health")` returning `{"status": "ok", "version": ...}`
- Root `docker-compose.yml` maps mcas port `8001:8000`
- `grep -q ok` WILL match the JSON response

## Verdict
**The CI smoke test assertion is CORRECT.** No change needed to `.github/workflows/ci.yml`.

## New Critical Finding Discovered
There is an **architectural mismatch** in the MCAS service build:

| Component | Technology | Health Endpoint |
|---|---|---|
| `services/mcas/app/main.py` | FastAPI (ASGI) | `/health` |
| `services/mcas/Dockerfile` | Django WSGI (`config.wsgi:application`) | `/healthz/` |
| `services/mcas/docker-compose.yml` | — | healthcheck uses `/healthz/` |
| Root `docker-compose.yml` | — | healthcheck uses `/health` |

### Impact
- The Dockerfile builds a Django WSGI app, but the source code is FastAPI.
- The sub-compose healthcheck (`/healthz/`) will fail against the FastAPI app.
- The root compose healthcheck (`/health`) is correct for FastAPI but contradicts the Dockerfile.

### Recommended Fix
1. Update `services/mcas/Dockerfile` to run the FastAPI app (e.g., `uvicorn main:app`)
2. Align `services/mcas/docker-compose.yml` healthcheck to use `/health`
3. OR: If Django is the intended runtime, migrate `app/main.py` to Django and keep `/healthz/`

## Action Taken
No changes committed to CI workflow. This finding filed for Week 2 remediation.
