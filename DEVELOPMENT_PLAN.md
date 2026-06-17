# DEVELOPMENT_PLAN.md

> Project: MISJustice Alliance Firm
> Current focus: centralized MCP control plane, Honcho shared memory, and Tailscale-only operator surfaces
> Source of truth: `docs/ARCHITECTURE.md` and `README.md`
> Status: living plan, synchronized with the current repository state

---

## 1. Purpose

This plan tracks the current implementation and remaining operational work for the MISJustice Alliance Firm platform.

The architecture now centers on the legal-research and advocacy stack, while also recognizing a separate technical-development and DevOps support stack that keeps the platform maintainable, observable, and secure.

The architecture now centers on:
- MCPJungle as the centralized MCP gateway and RBAC enforcement layer
- Honcho as the shared memory substrate
- Tailscale-only access for agent-facing dashboards and management UIs
- Prometheus/Grafana observability for gateway, tool, and memory metrics
- Explicit tool-group separation for legal, research, technical, and ops workloads

This document is intentionally current-state oriented. It replaces older planning language that referenced the pre-centralized stack as the primary architecture.

---

## 2. Current State Snapshot

### Implemented in repo

- `infra/docker-compose.yml` defines the centralized MCPJungle stack
- `infra/mcp-servers/` contains server definitions for legal, research, technical, and ops providers
- `infra/tool-groups/` contains the RBAC group manifests
- `infra/honcho/` contains the self-hosted Honcho deployment artifacts
- `infra/observability/` contains Prometheus/Grafana and Honcho queue metrics
- `infra/network/` documents Tailscale-only binding and firewall posture
- `infra/secrets/.env.template` lists required variables without plaintext secrets
- `README.md` has been updated to reflect the current architecture
- `docs/ARCHITECTURE.md` is the canonical architecture reference

### Verified at the file/config level

- Docker Compose configuration validates for the centralized stack
- Honcho Compose configuration validates with Tailscale host binding
- The architecture docs and README now describe MCPJungle, Honcho, and the legal-corpus tool group consistently

### Remaining live-work items

- Provision production-grade PostgreSQL and point MCPJungle at the external DSN
- Mint and store the MCPJungle admin credential in the project secrets vault
- Register live API keys and bearer tokens through environment-backed references only
- Verify Tailscale-only binding on the actual host interface
- Bring the dashboard, metrics scrape, and memory metrics online in a live deployment
- Complete client enrollment and RBAC checks for supervisor, worker, and human operator clients

---

## 3. Architecture Goals

1. Centralize all agent-facing tool access through MCPJungle
2. Enforce least-privilege access via RBAC tool groups
3. Keep legal, research, technical, and ops tooling separated by policy
4. Keep shared memory local and self-hosted through Honcho
5. Expose all UIs only over Tailscale
6. Maintain telemetry for tool calls, error rates, latency, and queue depth
7. Keep secrets out of the repository and out of direct agent tool calls

---

## 4. Phase Roadmap

| Phase | Status | Scope | Deliverable |
|---|---|---|---|
| P0 — Infrastructure definition | Complete | Compose manifests, tool-server manifests, tool groups, memory stack, observability | Repo-backed infra artifacts under `infra/` |
| P1 — Live deployment bootstrap | In progress | External PostgreSQL DSN, MCPJungle enterprise init, admin token minting, Tailscale binding | Running MCPJungle and Honcho services on the local host |
| P2 — RBAC client enrollment | Pending | Supervisor, worker, and human operator access profiles | Enforced client-to-group mappings |
| P3 — Observability and audit | Pending | Prometheus scrape, Grafana dashboards, Honcho queue exporter, gateway telemetry | Operational dashboards and scrape targets |
| P4 — Security hardening | Pending | Firewall posture, secret handling, token rotation, interface isolation | Zero-plaintext-secret, Tailscale-only operational posture |
| P5 — Handoff and ongoing ops | Pending | Runbooks, incident response, backup checks, periodic validation | Stable operator workflow and maintenance cadence |

---

## 5. Tool Groups and Access Model

### Legal corpus

- Midpage MCP
- legal-mcp
- American Default MCP
- Congress MCP
- Direct legal-source connectors where appropriate

### Research

- open-websearch
- exa-search
- firecrawl
- documentation and source-discovery tools used by the agent stack

### Technical

- UML/diagram generation
- sandboxed code execution
- repo documentation traversal
- context-aware library documentation lookup
- security scanning and document processing tools

### All-ops

- Honcho shared memory
- DevOps automation
- shared operational tooling
- privileged maintenance functions

### Read-only human access

- Dashboard visibility only
- No write access to tool groups or memory

---

## 6. Security and Compliance Constraints

- No plaintext secrets in git
- No public binding for MCPJungle or the agent-facing UIs
- Tailscale-only access for dashboards and operator-facing surfaces
- RBAC must be explicit and least-privilege by default
- Shared memory must remain self-hosted
- Tool registration and credential references must use environment variables or secret-file indirection
- Observability must avoid exposing sensitive payloads or credentials

---

## 7. Near-Term Execution Checklist

1. Start MCPJungle against the external PostgreSQL DSN
2. Run `mcpjungle init-server` and store the admin token in the secrets vault
3. Register all tool servers under `infra/mcp-servers/`
4. Create and validate the `legal-corpus`, `research`, `technical`, `all-ops`, and `dashboard-readonly` groups
5. Start Honcho from `infra/honcho/`
6. Register Honcho with MCPJungle as `honcho-memory`
7. Enable Prometheus scrape and Grafana dashboards
8. Verify Tailscale-only bindings for MCPJungle and any exposed UIs
9. Confirm the README and development plan remain synchronized after deployment changes

---

## 8. Definition of Done for the Current Architecture

The current architecture is complete when all of the following are true:

- MCPJungle is the single control plane for agent-facing MCP access
- Legal, research, technical, and ops tool groups are populated and enforced
- Honcho is serving shared memory locally and is wired into the control plane
- All operator surfaces are accessible only over Tailscale
- Metrics are being scraped and visualized
- No secrets are committed in plaintext
- The README and this development plan match the implemented architecture

---

## 9. Notes for Future Revisions

Update this file whenever any of the following change:
- control-plane topology
- tool-group membership
- memory substrate choice
- operator access model
- observability stack
- secret-handling pattern
- deployment target or network binding rules

Keep this document aligned with `docs/ARCHITECTURE.md` and the `infra/` tree.
