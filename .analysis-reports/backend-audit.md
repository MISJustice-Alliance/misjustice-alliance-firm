# Backend Code Audit — MISJustice Alliance

**Scope:** `apps/website/backend/`, `services/mcas/`, `src/orchestration/`, `src/agents/`, `crewAI/`

## 1. Code Quality & Type Safety

**TypeScript (Express) — `apps/website/backend/`**
- Good structural hygiene: layered architecture (services → repositories → models), custom `CaseServiceError` exceptions, and typed middleware (`auth.ts`, `rateLimiter.ts`).
- Brittle error classification in `errorHandler.ts` relies on `err.message.includes('database')`, which can misclassify errors or leak internal strings.
- `console.error` is used in several hot paths instead of the project's Winston logger, hurting production observability.

**Python (FastAPI / Agents) — `services/mcas/` & `src/`**
- `services/mcas/` uses modern Python 3.12 patterns: Pydantic v2 settings, `asyncpg` + SQLAlchemy 2.0 async, Alembic migrations, and annotated FastAPI dependencies.
- `crewAI/pyproject.toml` enforces strict `mypy`, `ruff`, `bandit`, and pip-audit with CVE overrides—exemplary security posture.
- `src/` is excluded from mypy in the root `pyproject.toml`, leaving orchestration and agent code without static type enforcement.

## 2. API Patterns Consistency

- **Divergent response envelopes:** The Express backend wraps errors as `{ success: false, error: { code, message } }`, while the FastAPI MCAS service returns raw Pydantic models and standard `HTTPException`. Unifying on OpenAPI-first schemas across both stacks would improve client reliability.
- **Rate limiting:** The Express middleware implements a custom in-memory sliding window (`MemoryStore`). It is well-tested but process-local; in a multi-instance deployment it offers no real protection because state is not shared.
- **Auth patterns:** JWT verification is solid (`jwt.ts` validates secrets at module load, rejects short/placeholder values, and uses `jti` claims). Cookie auth exists but relies on the same `verifyAccessToken` routine without explicit cookie-security flag checks.

## 3. Test Coverage Gaps

- **Well-covered:** `apps/website/backend/tests/` has unit tests for services/repositories and integration tests for auth, cases, and webhooks. `services/mcas/tests/test_api.py` covers matter CRUD, documents, events, audit, and search with graceful-degradation assertions.
- **Gaps:** No tests were found for `src/orchestration/human_gateways.py`, `src/agents/research/`, or `src/integrations/graph_db/`. The root `agents/` directory contains only YAML configuration, so agent behavior is untested outside of any downstream integration suite.
- **Missing:** No contract or smoke tests between the Express backend and the MCAS service; failures at the service boundary would only surface in production.

## 4. Top 3 Concrete Bugs / Missing Implementations

1. **Broken method signature in `constitutional_violation_detector.py`**  
   `find_supporting_precedent(self, ...)` is defined as a module-level async function with a `self` parameter. Calling it as a method will raise `TypeError`. Its annotated return type is `list[dict[str, Any]]`, yet the function returns a `dict`.

2. **Hardcoded default credentials in `services/mcas/app/config.py`**  
   `minio_access_key` and `minio_secret_key` default to `minioadmin` / `minioadmin`. If environment variables are omitted in production, the application boots with widely known credentials (CWE-798).

3. **Unbounded outbound HTTP without status validation in `human_gateways.py`**  
   `request_attorney_assignment` and `submit_document_for_review` call `response.json()` unconditionally. Non-2xx or non-JSON responses will raise unhandled `aiohttp` exceptions, potentially leaking webhook secrets in stack traces. Additionally, `datetime.now()` is naive (no timezone).

## Recommendations

- Replace the in-memory rate-limit store with Redis and run the TS backend behind a load-balancer that honors `X-Forwarded-For`.
- Add `minio_access_key: str | None = None` (no default) and fail-fast on missing object-store credentials.
- Extend test coverage to `src/orchestration/` and `src/integrations/`; treat agent gateway failures as first-class error scenarios.
