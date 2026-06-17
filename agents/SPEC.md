# MISJustice Alliance Agent MCP Access SPEC

> **Version**: 1.0.0
> **Scope**: Define which MISJustice Alliance agents require access to MCPJungle tool groups and the upstream tools they use.
> **Source of truth**: `docs/ARCHITECTURE.md` and `README.md`

---

## 1. Purpose

This spec defines the agent access model for the centralized MCP control plane.

The platform uses MCPJungle as the single registry and policy layer for agent-facing tools. Agents do not receive arbitrary direct access to upstream services. Instead, they are granted RBAC-scoped tool groups such as `legal-corpus`, `research`, `technical`, `all-ops`, or `dashboard-readonly`.

The legal-research stack and the technical/DevOps support stack are separate multi-agent domains:

- the legal-research stack uses the legal corpus, research, and publication tools to produce case work, advocacy materials, and verified citations
- the technical/DevOps stack maintains the gateway, memory layer, deployment artifacts, observability, and support tooling that keep the platform operational

---

## 2. Legal-corpus providers

The `legal-corpus` group bundles the platform’s U.S. legal research sources:

- Midpage MCP — primary U.S. state/federal case law, court dockets, citation retrieval, PACER access on demand, opinion lookup, and passage extraction
- legal-mcp — supplemental U.S. caselaw MCP for opinion search and metadata support
- American Default MCP — U.S. law reference layer for statutes and doctrinal orientation
- Congress MCP — live U.S. Congressional data for bills, votes, members, committees, hearings, and legislative history

These providers are used to keep legal research source-backed rather than relying on opaque summaries.

---

## 3. Required access by agent class

| Agent / stack | MCPJungle groups | Upstream tools | Notes |
|---|---|---|---|
| `hermes-supervisor` | `legal-corpus`, `research`, `technical`, `all-ops` | All registered tools | Full orchestration and governance access |
| `rae` | `legal-corpus`, `research`, `technical` | Midpage, legal-mcp, American Default MCP, Congress MCP | Primary legal research |
| `lex` | `legal-corpus`, `research`, `technical` | Midpage, legal-mcp, American Default MCP, Congress MCP | Legal analysis and verification |
| `citation_authority` | `legal-corpus`, `research` | Midpage, legal-mcp, American Default MCP, Congress MCP | Citation and authority verification |
| `casey` | `legal-corpus`, `research` | Midpage, legal-mcp, American Default MCP, Congress MCP | Referral packet support and counsel research |
| `quill` | `legal-corpus`, `research` | Midpage, legal-mcp, American Default MCP, Congress MCP | Public legal-resource pages and citation-backed drafts |
| `iris` | `research`, `technical` | Conditional `legal-corpus` access via supervisor | Public-record work may require legal-source validation |
| `chronology` | `research` | Legal-corpus outputs consumed indirectly | Timeline validation and source ordering |
| technical / DevOps support stack | `technical`, `all-ops` | MCPJungle admin and ops tooling, Honcho, deployment and observability tools | Support stack for maintenance, upgrades, and infrastructure stewardship |
| `human-operator` | `dashboard-readonly` | Dashboard and metrics read-only surfaces | No write access |

---

## 4. Access rules

1. Legal-corpus access is need-to-know. It is granted to legal-research and publication roles that require primary authority.
2. The technical/DevOps support stack does not receive legal-corpus by default.
3. `all-ops` is supervisor-only.
4. `human-operator` is dashboard-only and read-only.
5. All tool access must remain Tailscale-only at the network boundary.
6. No plaintext credentials are stored in this spec.

---

## 5. Role-specific expectations

### 5.1 Hermes supervisor

Hermes is the only agent class with full access across all groups. It orchestrates legal, research, technical, and support workflows.

### 5.2 Legal-research roles

Rae, Lex, Citation / Authority, Casey, and Quill all need `legal-corpus` access because their outputs depend on primary legal authority, citation verification, or public-facing legal publication.

### 5.3 Conditional legal access

Iris and Chronology do not need constant direct legal-corpus access, but they may consume legal-source outputs when a matter requires legal authority checks or chronology validation.

### 5.4 Support roles

The technical and DevOps support stack exists to maintain the platform, not to perform legal analysis. It should be constrained to technical and operations tooling unless a specific incident requires supervised access to legal-source verification.

---

## 6. Verification targets

Before treating this spec as satisfied, verify:

- all legal-research agent README files reference the MCPJungle legal-corpus group
- the architecture doc documents Midpage, legal-mcp, American Default MCP, and Congress MCP
- support-stack descriptions remain separate from legal-research descriptions
- the access matrix matches the current MCPJungle group manifests
- the dashboard-only human operator role remains read-only

---

## 7. Canonical references

- `docs/ARCHITECTURE.md`
- `agents/README.md`
- `README.md`
- `infra/tool-groups/`
- `infra/mcp-servers/`

---

## 8. Final note

If agent responsibilities or upstream legal sources change, update this spec and the architecture doc together.
