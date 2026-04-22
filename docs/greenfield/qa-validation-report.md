# QA Validation Report — Greenfield Implementation

**Project:** MISJustice Alliance Firm  
**Reference:** `docs/greenfield/architect-design.md` Section 3 (Data Model & API Contracts)  
**Date:** 2026-04-22  
**Validator:** QA Tester  

---

## 1. Executive Summary

The greenfield implementation delivers a **Phase-0-quality** MCAS API (FastAPI + PostgreSQL) and a **React portal frontend** that is entirely mocked. The core data model, Alembic migrations, Docker Compose stack, and nginx reverse-proxy configuration align well with the architecture spec. However, there are **critical functional gaps**, **race conditions**, **blocking I/O in async paths**, and **CI pipeline bugs** that must be resolved before the stack can be considered production-ready.

| Component | Status | Blockers |
|---|---|---|
| `services/mcas/` (API) | ⚠️ Partial — core entities match spec, but has race conditions & missing endpoints | 2 critical, 4 major |
| `apps/portal/` (React) | ⚠️ Mock-only — no real backend integration | 1 critical |
| `docker-compose.yml` | ✅ Mostly correct — stack is comprehensive | 1 major (network isolation) |
| `infra/` configs | ✅ Good — nginx, LiteLLM, SearXNG configs present | 1 minor |
| `.github/workflows/ci.yml` | ⚠️ Functional but contains a failing smoke-test assertion | 1 major |

---

## 2. What Was Implemented Correctly

### 2.1 MCAS Data Model (`services/mcas/app/models.py`)

- **Entities:** `Matter`, `Actor`, `Document`, `Event`, `AuditEntry` are all present and match the spec fields, types, and relationships (lines 59–140).
- **Enums:** `MatterClassification`, `MatterStatus`, `ActorType`, `DocumentClassification`, `EventType` correctly mirror the architecture design (lines 18–57).
- **Relationships:** SQLAlchemy `relationship` + `back_populates` with `cascade="all, delete-orphan"` correctly models the containment hierarchy specified in §3.1.
- **Audit trail:** `AuditEntry` includes `ip_address`, `user_agent`, `timestamp`, and `diff` as required (lines 128–140).

### 2.2 API Contract Coverage (`services/mcas/app/routers/`)

| Spec Endpoint | Implementation | File |
|---|---|---|
| `POST /api/v1/matters` | ✅ Implemented | `matters.py:65` |
| `GET /api/v1/matters/{id}` | ✅ Implemented with eager loading | `matters.py:87` |
| `POST /api/v1/matters/{id}/documents` | ✅ Implemented (multipart upload) | `matters.py:111` |
| `POST /api/v1/matters/{id}/events` | ✅ Implemented | `matters.py:148` |
| `GET /api/v1/matters/{id}/audit` | ✅ Implemented | `matters.py:176` |
| `POST /api/v1/search` | ✅ Stub implemented | `search.py:12` |

### 2.3 Database Migrations & Infrastructure

- **Alembic:** Initial migration `0001_initial.py` faithfully reproduces the model DDL with proper indexes, `UUID` PKs, `JSONB` defaults, and foreign keys.
- **Dockerfile:** Multi-stage build (`builder` → production image) is efficient and correctly installs runtime `libpq5` (lines 1–34).
- **docker-compose.yml:** Brings up the full Phase 0 stack (Postgres 16, Neo4j 5, Qdrant, Elasticsearch 8, SearXNG, LiteLLM, Redis, MinIO, n8n, nginx) with healthchecks and dependency ordering.
- **nginx.conf:** Matches the deployment topology from §1:
  - `/api/v1/mcas/` → MCAS (lines 98–115)
  - `/search/` → SearXNG (lines 130–143)
  - `/n8n/` → n8n with WebSocket support (lines 149–182)
  - Static SPA fallback for `/` (lines 187–205)
  - Rate-limiting zones defined (lines 48–51).

### 2.4 Frontend Structure (`apps/portal/`)

- **Routing:** `BrowserRouter` with `/`, `/dashboard`, `/approvals` routes (`App.tsx`).
- **Accessibility:** Proper `aria-label`, `aria-expanded`, `aria-current`, `aria-live` attributes are used throughout `Layout.tsx`, `MatterDashboard.tsx`, `IntakeForm.tsx`, and `ApprovalInbox.tsx`.
- **Type safety:** `types/index.ts` mirrors the API schema with TypeScript interfaces for all core entities.

---

## 3. Gaps and Deviations from Spec

### 3.1 Missing API Endpoints / Operations

| Missing Capability | Severity | Spec Reference |
|---|---|---|
| **Actor CRUD** — there is no `POST /matters/{id}/actors` endpoint. The `Actor` model exists but cannot be created via the API. | **Major** | §3.1 (Actor entity) |
| **Document retrieval** — documents can be uploaded but there is no `GET` endpoint to list or download them. | **Major** | §3.2 |
| **Matter updates** — no `PATCH` or `PUT` for status transitions (e.g., `INTAKE` → `RESEARCH`). | **Major** | §3.2 implied lifecycle |
| **GraphQL endpoint** — spec says MCAS exposes "REST + GraphQL"; only REST is implemented. | **Minor** | §2.1 |
| **MemoryPalace schema** — `MemoryFragment` entity from §3.3 is not implemented (acceptable for Phase 0, but documented here). | **Info** | §3.3 |

### 3.2 Portal Is Entirely Mocked

**File:** `apps/portal/src/api/mcas.ts`  
**Lines:** 14–216

The React portal does **not** call the MCAS API. All data is hard-coded in-memory (`matters`, `approvals` arrays). The `createMatter` function mutates a local array and returns a mock UUID. This is a **critical deviation** for any acceptance test: the frontend and backend are not integrated.

### 3.3 Security & Tier Enforcement Gaps

| Gap | File | Line(s) | Impact |
|---|---|---|---|
| No authentication or authorization | `matters.py` | Multiple `# TODO: authenticate` comments | Anyone can create/read any matter |
| `tier` parameter in search is ignored | `search.py` | 12–84 | Tier-1 data could leak through search |
| `Actor.real_name_encrypted` is `nullable=False` but no encryption layer exists | `models.py` | 88 | Schema enforces presence but app does not encrypt |
| `uploaded_by` is a random UUID | `matters.py` | 139 | Audit attribution is meaningless |

### 3.4 Docker-Compose Network Isolation Deviation

**File:** `docker-compose.yml`  
**Line:** 370

```yaml
backend:
  driver: bridge
  internal: false
  name: misjustice-backend
```

The architecture design (§1, Deployment Topology) calls for an **internal network** (mTLS via Linkerd/Cilium). Setting `internal: false` exposes backend services to the host/external world. While this is acceptable for local dev, it is a deviation from the spec’s security posture and should be gated behind a profile or documented.

### 3.5 Direct MCAS Port Exposure

**File:** `docker-compose.yml`  
**Line:** 59

```yaml
ports:
  - "8001:8000"
```

The deployment topology specifies that MCAS is accessed **only** through the nginx ingress at `/api/v1/mcas`. Exposing port `8001` directly bypasses rate limiting and security headers.

---

## 4. Bugs and Issues Found in Code

### 4.1 Critical Bugs

#### BUG-001 — Race Condition in `display_id` Generation
**File:** `services/mcas/app/routers/matters.py`  
**Lines:** 33–42

```python
count = result.scalar() or 0
display_id = f"{prefix}{count + 1:04d}"
```

This is **not atomic**. Two concurrent matter creations will read the same `count`, producing duplicate `display_id` values. The unique constraint on `display_id` will cause one request to fail with a 500.

**Fix:** Use a PostgreSQL sequence or advisory lock, or generate IDs with `uuid` + a separate human-readable serial table.

---

#### BUG-002 — `_log_audit` Commits Independently, Risking Inconsistent State
**File:** `services/mcas/app/routers/matters.py`  
**Lines:** 45–63

```python
async def _log_audit(...):
    ...
    db.add(entry)
    await db.commit()        # <-- commits here
```

Every router handler that calls `_log_audit` **also** calls `await db.commit()` after it. This results in **two commits** per request. If the second commit fails, the audit log is already persisted, creating an orphan audit entry with no corresponding matter change.

**Fix:** Remove `await db.commit()` from `_log_audit`; let the caller control the transaction boundary.

---

#### BUG-003 — Blocking Synchronous File I/O Inside Async Handler
**File:** `services/mcas/app/routers/matters.py`  
**Lines:** 128–131

```python
os.makedirs(os.path.dirname(storage_path), exist_ok=True)
with open(storage_path, "wb") as f:
    f.write(content)
```

`open()` and `f.write()` are **blocking syscalls** running on the main event loop. Under load this will stall all concurrent requests.

**Fix:** Use `aiofiles` or `asyncio.to_thread()` for file operations.

---

#### BUG-004 — CI Smoke Test Asserts Wrong Health String
**File:** `.github/workflows/ci.yml`  
**Line:** 177

```yaml
run: |
  curl -fsS http://localhost:8001/health | grep -q healthy
```

The `/health` endpoint returns:
```json
{"status": "ok", "version": "0.1.0"}
```

There is no substring `"healthy"`. The grep will fail, causing the CI `build` job to fail.

**Fix:** Change assertion to `grep -q '"status":"ok"'` or `grep -q '"ok"'`.

---

### 4.2 Major Issues

#### ISSUE-005 — Portal Lint / React Hook Errors
**File:** `apps/portal/src/pages/ApprovalInbox.tsx`  
**Line:** 47

```javascript
useEffect(() => {
  load();   // <-- calls setState synchronously inside effect
}, []);
```

ESLint (`react-hooks/set-state-in-effect`) flags this as a cascading-render anti-pattern.

**File:** `apps/portal/src/api/mcas.ts`  
**Lines:** 14, 218

`let matters` and `let approvals` are never reassigned; ESLint `prefer-const` errors.

---

#### ISSUE-006 — Pydantic V2 Deprecation Warnings
**Files:** `services/mcas/app/config.py` (line 5), `services/mcas/app/schemas.py` (lines 29, 56, 79, 98, 119, 134)

All Pydantic models use the deprecated `class Config:` syntax instead of `ConfigDict` or `model_config`.

**Example:**
```python
class ActorResponse(ActorBase):
    ...
    class Config:
        from_attributes = True
```

**Fix:** Replace with `model_config = ConfigDict(from_attributes=True)`.

---

#### ISSUE-007 — Search Ignores `tier` and `filters`
**File:** `services/mcas/app/routers/search.py`  
**Lines:** 12–84

The `SearchRequest` schema accepts `tier`, `matter_id`, and `filters`, but the handler only uses `query` and `matter_id`. There is no tier-based filtering, no Elasticsearch/Qdrant integration, and no use of `filters`.

---

#### ISSUE-008 — Unused / Dead Code
**File:** `services/mcas/app/routers/matters.py`  
**Lines:** 13, 18–20

Imports `Actor`, `ActorCreate`, `ActorResponse`, `DocumentCreate` are never used.

**File:** `services/mcas/app/models.py`  
**Line:** 11

`sqlalchemy.Integer` is imported but unused.

**File:** `services/mcas/app/main.py`  
**Line:** 6

`Base` is imported but unused.

---

#### ISSUE-009 — Missing Type Annotations
**File:** `services/mcas/app/database.py`

Functions `_create_engine`, `get_engine`, `set_engine`, `get_session_maker`, `get_db` lack return-type annotations, causing mypy errors.

---

### 4.3 Minor Issues

#### ISSUE-010 — `AsyncClient` Constructor Deprecated Signature
**File:** `services/mcas/tests/conftest.py`  
**Line:** 53

```python
async with AsyncClient(app=app, base_url="http://test") as ac:
```

Modern `httpx` expects `transport=ASGITransport(app=app)`. The current signature triggers deprecation warnings in newer httpx versions.

#### ISSUE-011 — Test File Has Unused Imports
**File:** `services/mcas/tests/test_api.py`  
**Lines:** 3, 7, 9–11

`AsyncSession`, `MatterClassification`, `EventType`, `ActorType`, `DocumentClassification` are imported but unused.

#### ISSUE-012 — Import Sorting
**Files:** All Python files in `services/mcas/`

`ruff check` reports `I001` (import block is un-sorted or un-formatted) in nearly every module.

---

## 5. Test Coverage Assessment

### 5.1 What Is Covered

**File:** `services/mcas/tests/test_api.py` (127 lines)

| Scenario | Test Method | Status |
|---|---|---|
| Create matter (happy path) | `TestMatters.test_create_matter` | ✅ |
| Get matter by ID | `TestMatters.test_get_matter` | ✅ |
| Get matter 404 | `TestMatters.test_get_matter_not_found` | ✅ |
| Upload document | `TestDocuments.test_create_document` | ✅ |
| Upload document to missing matter | `TestDocuments.test_create_document_matter_not_found` | ✅ |
| Create event | `TestEvents.test_create_event` | ✅ |
| Create event on missing matter | `TestEvents.test_create_event_matter_not_found` | ✅ |
| Get audit log | `TestAudit.test_get_audit_log` | ✅ |
| Get audit log for missing matter | `TestAudit.test_get_audit_log_matter_not_found` | ✅ |
| Search returns results | `TestSearch.test_search_matters` | ✅ |
| Search empty results | `TestSearch.test_search_no_results` | ✅ |

### 5.2 What Is Missing

| Missing Test | Risk |
|---|---|
| **Actor CRUD** — no tests because endpoint is missing | High |
| **Concurrent display_id generation** — race condition not exercised | High |
| **Document download / retrieval** — endpoint missing | Medium |
| **Tier-based search filtering** — parameter ignored | Medium |
| **Large file upload / multipart edge cases** | Medium |
| **Invalid UUID format in path params** — FastAPI handles it, but no regression test | Low |
| **Auth failure paths** — no auth layer yet | Medium |
| **Database rollback on exception** — no error-injection tests | Medium |
| **Unit tests with mocked DB** — all tests require real Postgres | Low (acceptable for integration suite) |

### 5.3 Test Infrastructure Issues

- **Local execution fails:** `ModuleNotFoundError: No module named 'asyncpg'` when running outside the Docker/venv context. This is an environment issue, not a code bug, but it blocks local TDD.
- **CI coverage upload:** Uses `codecov/codecov-action@v4` without an explicit token. In recent GitHub Actions environments this may fail for private repositories.

---

## 6. Recommendations

### 6.1 Immediate Fixes (Block Production)

1. **Fix display_id race condition** (`matters.py:33–42`)
   - Replace count-based logic with a PostgreSQL sequence or `INSERT ... ON CONFLICT` retry loop.

2. **Fix audit-log transaction boundary** (`matters.py:45–63`)
   - Remove `await db.commit()` from `_log_audit`. Ensure audit entries are flushed but committed only by the caller.

3. **Fix blocking file I/O** (`matters.py:128–131`)
   - Wrap file write in `asyncio.to_thread()` or use `aiofiles`.

4. **Fix CI smoke-test assertion** (`.github/workflows/ci.yml:177`)
   - Change `grep -q healthy` to `grep -q '"status":"ok"'`.

5. **Fix portal lint errors** (`ApprovalInbox.tsx:47`, `mcas.ts:14,218`)
   - Move initial data load out of `useEffect` synchronous path (e.g., use an async function inside effect) and change `let` to `const`.

### 6.2 Short-Term Improvements (Next Sprint)

6. **Add Actor endpoints**
   - `POST /matters/{id}/actors` and `GET /matters/{id}/actors` to satisfy the spec’s entity graph.

7. **Integrate portal with real API**
   - Replace mock `mcasApi` with `fetch` calls to `/api/v1/...`, or at minimum add an environment-based `USE_MOCK` toggle so integration can be tested.

8. **Enforce tier filtering in search**
   - Reject or filter `tier` mismatches in `search.py` until Elasticsearch/Qdrant integration is ready.

9. **Upgrade Pydantic config syntax**
   - Replace all `class Config:` with `model_config = ConfigDict(...)` to eliminate deprecation warnings.

10. **Add pre-commit / lint enforcement**
    - Run `ruff check --fix` and `ruff format` across `services/mcas`. Add a `.pre-commit-config.yaml`.

11. **Improve docker-compose network isolation**
    - Set `backend` network to `internal: true` and expose MCAS **only** through nginx in production profiles.

### 6.3 Medium-Term Hardening

12. **Add document retrieval endpoint**
    - `GET /matters/{id}/documents` and `GET /documents/{id}` with proper `Content-Type` and `Content-Disposition`.

13. **Add matter status transition validation**
    - Prevent invalid jumps (e.g., `CLOSED` → `INTAKE`) via a state machine.

14. **Implement field-level encryption for `Actor.real_name_encrypted`**
    - Use Vault Transit or a libsodium wrapper before persisting to Postgres.

15. **Expand test matrix**
    - Add pytest cases for concurrent matter creation, invalid UUIDs, oversized uploads, and auth middleware (once implemented).

16. **Fix mypy configuration**
    - Add a `mypy.ini` or `pyproject.toml` section with `python_version = "3.12"`, `strict = true`, and `ignore_missing_imports = true` for alembic/sqlalchemy stubs. Add return-type annotations to `database.py`.

---

## 7. Exit Criteria vs. Current State

| Phase 0 Success Criteria | Status | Notes |
|---|---|---|
| Operator can create a matter and spawn a single agent | ⚠️ Partial | Matter creation works; agent spawning is not implemented |
| All APIs have OpenAPI docs | ✅ Pass | FastAPI auto-generates docs at `/docs` |
| `docker compose up` brings up full local stack | ✅ Pass | All services defined with healthchecks |
| Frontend can intake a matter anonymously | ⚠️ Partial | UI exists but writes to local mock only |
| CI passes (lint, typecheck, test, build) | ❌ Fail | Smoke-test assertion is broken; ruff/mypy have errors |

---

## 8. Appendix — Quick Reference of Findings

| ID | File | Line | Finding | Severity |
|---|---|---|---|---|
| BUG-001 | `app/routers/matters.py` | 33–42 | Race condition in `display_id` | Critical |
| BUG-002 | `app/routers/matters.py` | 45–63 | `_log_audit` commits independently | Critical |
| BUG-003 | `app/routers/matters.py` | 128–131 | Blocking `open()` in async handler | Critical |
| BUG-004 | `.github/workflows/ci.yml` | 177 | Smoke test greps for `"healthy"` instead of `"ok"` | Critical |
| ISSUE-005 | `apps/portal/src/pages/ApprovalInbox.tsx` | 47 | `setState` called synchronously in `useEffect` | Major |
| ISSUE-005 | `apps/portal/src/api/mcas.ts` | 14, 218 | `let` used where `const` suffices | Major |
| ISSUE-006 | `app/config.py`, `app/schemas.py` | Multiple | Pydantic `class Config` deprecated | Major |
| ISSUE-007 | `app/routers/search.py` | 12–84 | `tier`/`filters` ignored in search | Major |
| ISSUE-008 | `app/routers/matters.py` | 13, 18–20 | Unused imports (`Actor`, `ActorCreate`, etc.) | Minor |
| ISSUE-009 | `app/database.py` | 11–54 | Missing type annotations | Minor |
| ISSUE-010 | `tests/conftest.py` | 53 | `AsyncClient(app=...)` deprecated | Minor |
| ISSUE-011 | `tests/test_api.py` | 3, 7, 9–11 | Unused imports | Minor |
| ISSUE-012 | All `.py` files | — | Import blocks unsorted (ruff I001) | Minor |
| GAP-001 | `apps/portal/src/api/mcas.ts` | 14–216 | Entire API is mocked | Critical |
| GAP-002 | `app/routers/matters.py` | — | No Actor CRUD endpoints | Major |
| GAP-003 | `docker-compose.yml` | 370 | `backend` network not `internal` | Major |
| GAP-004 | `docker-compose.yml` | 59 | MCAS port exposed directly | Minor |
