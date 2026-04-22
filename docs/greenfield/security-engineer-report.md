# AUDIT: MISJustice Alliance Firm — STRIDE Threat Model & Security Architecture Review

> **Classification:** Tier 2 — Internal Platform Security Review  
> **Scope:** Full platform architecture, agent runtime, data plane, HITL governance, and external integrations  
> **Reviewer:** Security Engineer (AI Agent)  
> **Date:** 2026-04-22  
> **Version:** 1.0.0  
> **Risk Rating Scale:** CRITICAL | HIGH | MEDIUM | LOW | INFO  

---

## Executive Summary

The MISJustice Alliance Firm architecture demonstrates a mature understanding of operational security, anonymity, and legal-ethical constraints. The design correctly identifies zero-trust principles, tiered data classification, sandbox isolation, and mandatory human-in-the-loop (HITL) governance as foundational requirements. However, **the platform is currently in early architecture phase with several high-severity implementation gaps** that, if left unaddressed, could expose complainant identities, waive attorney-client privilege, enable unauthorized practice of law (UPL), or allow adversarial manipulation of the agent stack.

This report applies the STRIDE methodology across all seven architectural layers, identifies privacy and anonymity risks unique to a legal-advocacy AI platform, catalogues data-classification and access-control gaps, and provides a prioritized remediation roadmap with compliance mappings.

**Top 5 Critical Findings:**
1. **Cloud LLM Data Exposure (CRITICAL):** Tier-0 and Tier-1 content can reach OpenAI/Anthropic inference endpoints through the LiteLLM proxy, creating privilege-waiver and PII-exposure risks.
2. **LangSmith Cloud Tracing (CRITICAL):** Full agent execution traces—including tool inputs, retrieval context, and LLM completions—are sent to LangSmith's cloud SaaS, potentially exposing case-specific legal analysis and pseudonymous matter references.
3. **HITL Approval URL Tokens (HIGH):** n8n approval/defer/reject URLs embed single-use bearer tokens in query parameters, making them vulnerable to browser history leakage, proxy logs, and referrer header exposure.
4. **MemoryPalace Classification Enforcement Gap (HIGH):** SPEC.md explicitly lists this as an unimplemented control; agents could write Tier-1 content to cross-session memory before the middleware is verified.
5. **Vane Unauthenticated T4-Admin Access (HIGH):** The operator search interface holds the highest-privilege search token but lacks upstream authentication and RBAC, creating a direct path to full engine-group access if the Vane endpoint is reached by an unauthorized user.

---

## 1. Threat Inventory by STRIDE Category

### 1.1 Spoofing (S) — Identity Fraud & Impersonation

| ID | Threat | Target Component | Severity | CVSS ~ |
|---|---|---|---|---|
| S-01 | **Compromised agent OAuth2 token allows spoofing as any agent role.** MCAS API tokens are scoped per role but share the same issuer; a leaked Tier-2 token could be replayed to access Tier-1 document endpoints if scope validation is flawed. | MCAS REST API | HIGH | 7.5 |
| S-02 | **Transient subagents are not Paperclip-registered.** Hermes spawns subagents that bypass the control-plane org chart, making their actions attributable only to Hermes, not to a persistent auditable identity. | Hermes / OpenClaw | MEDIUM | 6.1 |
| S-03 | **n8n webhook tokens in URL query params enable approval spoofing.** An attacker with access to browser history, proxy logs, or referrer headers can replay approval URLs to authorize intake, publication, or referral packets without operator consent. | n8n HITL webhooks | HIGH | 6.8 |
| S-04 | **Telegram/Discord bot token compromise allows spoofing as n8n approval channel.** If messaging bot tokens leak, an attacker can inject fake approval messages or intercept legitimate ones. | n8n → Telegram/Discord | MEDIUM | 5.9 |
| S-05 | **Third-party cloud LLM provider impersonation.** LiteLLM routes to OpenAI/Anthropic; no certificate pinning or model-signature verification is documented, leaving a supply-chain vector for model substitution or prompt interception. | LiteLLM / LLM providers | MEDIUM | 5.3 |
| S-06 | **Operator session hijacking via stolen API key + TOTP.** Hermes CLI auth uses API key + TOTP but no mention of session binding to device fingerprint or IP; a phished TOTP (valid for 30s) plus key enables full operator impersonation. | Hermes CLI/TUI | MEDIUM | 6.2 |

### 1.2 Tampering (T) — Unauthorized Modification

| ID | Threat | Target Component | Severity | CVSS ~ |
|---|---|---|---|---|
| T-01 | **Agent output tampering before HITL review.** Research memos, chronologies, and referral packets traverse multiple agents (Rae → Lex → Citation Agent). A compromised intermediate agent or man-in-the-middle on internal HTTP could modify citations, facts, or redaction status before human review. | crewAI inter-agent messaging | HIGH | 7.1 |
| T-02 | **OpenShell policy YAML tampering.** Sandbox policies are declarative YAML files in `services/openshell/policies/`. If an attacker with repository write access modifies a policy to broaden network egress or filesystem access, sandbox escape becomes possible. | OpenShell / NemoClaw | HIGH | 7.4 |
| T-03 | **MemoryPalace memory poisoning.** Cross-session memory is writable by multiple agents. A compromised or misaligned agent could inject false memories (e.g., fake precedent, fabricated chronology events) that persist across sessions and influence future research. | MemoryPalace MCP | HIGH | 7.0 |
| T-04 | **n8n workflow definition tampering.** Workflow definitions are version-controlled in `workflows/n8n/` but are loaded into the running n8n instance. An attacker with n8n UI access or filesystem access could modify an approval workflow to auto-approve publication gates. | n8n | CRITICAL | 8.1 |
| T-05 | **LiteLLM proxy config tampering.** If an attacker modifies the LiteLLM config to point search tools at a malicious SearXNG instance, all agent research could be redirected to attacker-controlled sources. | LiteLLM | HIGH | 7.2 |
| T-06 | **GitBook/public website tampering via compromised Webmaster credentials.** Webmaster has Tier-3 write access; if credentials are stolen, published case summaries could be altered to remove redactions or add false accusations. | Webmaster / GitBook API | MEDIUM | 5.8 |

### 1.3 Repudiation (R) — Denial of Action & Audit Integrity

| ID | Threat | Target Component | Severity | CVSS ~ |
|---|---|---|---|---|
| R-01 | **No cryptographic non-repudiation on HITL approvals.** Operator approvals via Telegram/Discord/iMessage/n8n UI are logged but not digitally signed. An operator could later deny approving a controversial publication or referral packet. | n8n / HITL gates | HIGH | 6.5 |
| R-02 | **Audit log immutability not guaranteed.** Veritas reads the OpenClaw audit log via a read-only filesystem mount, but there is no documented write-once storage (e.g., append-only WORM filesystem, blockchain anchor, or centralized tamper-evident log). A host-level attacker could modify or truncate logs. | Veritas / OpenClaw audit | HIGH | 6.7 |
| R-03 | **LangSmith as external audit dependency.** LangSmith cloud stores execution traces; if LangSmith data is lost, modified, or subpoenaed, the platform loses audit continuity for agent runs. | LangSmith tracing | MEDIUM | 5.5 |
| R-04 | **Agent action attribution ambiguity in crewAI parallel execution.** When Rae, Lex, and Iris run in parallel within a hierarchical crew, intermediate outputs may lack clear cryptographic attribution to the originating agent, complicating post-incident forensics. | crewAI AMP Suite | MEDIUM | 5.2 |
| R-05 | **No timestamp authority for audit events.** Audit logs rely on system clocks; without a trusted timestamp authority (TSA), clock skew or manipulation could cast doubt on event ordering during incident response. | All audit streams | LOW | 3.9 |

### 1.4 Information Disclosure (I) — Data Leakage & Privacy Violations

| ID | Threat | Target Component | Severity | CVSS ~ |
|---|---|---|---|---|
| I-01 | **Tier-0/1 data exposure to cloud LLM providers.** The LiteLLM proxy routes agent inference to OpenAI (`gpt-4o`) and Anthropic. Even with `strip_caller_identity: true`, the prompt context may contain Tier-1 pseudonymous matter references, legal analysis, or OSINT findings. OpenAI/Anthropic data-retention and training policies are outside platform control. **This is a potential attorney-client privilege waiver.** | LiteLLM / Cloud LLMs | CRITICAL | 8.5 |
| I-02 | **LangSmith cloud tracing leaks case context.** Every agent run, tool invocation, retrieval call, and LLM completion is traced to LangSmith. Traces include query text, retrieved documents, and agent outputs—potentially sufficient to reconstruct matter details, legal theories, and actor identities. | LangSmith Agent Builder | CRITICAL | 8.3 |
| I-03 | **Vector embedding inversion attacks on OpenRAG.** Tier-2 de-identified documents are vectorized and stored in OpenSearch/Qdrant. Research has demonstrated that embeddings can be inverted to recover approximate source text, especially with repeated queries. An attacker with vector-store read access could reconstruct sensitive case content. | OpenRAG / Qdrant | HIGH | 7.3 |
| I-04 | **SearXNG query log aggregation de-anonymization.** T3 PI-tier queries log target names, roles, and matter IDs. An attacker with access to the audit log could correlate multiple T3 sessions to infer complainant identities (e.g., "Officer J. Doe excessive force 2024" + "Missoula County DV shelter incident March 2024"). | SearXNG / Audit log | HIGH | 6.9 |
| I-05 | **Vane file upload metadata leakage.** Document uploads to Vane may retain EXIF GPS data, author names, creation timestamps, or revision history. If Tier-2 documents originated from Tier-1 sources, metadata could re-identify parties. | Vane UI / Document upload | MEDIUM | 5.7 |
| I-06 | **Telegram/Discord/iMessage as third-party HITL channels.** Approval messages and escalation alerts transit third-party messaging infrastructure. Content may be stored on Telegram/Discord servers, subject to their terms of service and lawful access by foreign governments. | n8n → Messaging | MEDIUM | 5.4 |
| I-07 | **Public git repository reveals attack surface.** The repository is public and contains detailed architecture diagrams, service topology, agent role definitions, and policy files. While no sensitive data is present, this aids adversarial reconnaissance. | GitHub repository | LOW | 4.1 |
| I-08 | **LawGlance query pattern leakage.** Although LawGlance handles only public legal information, query sequences (e.g., Montana § 1983 + qualified immunity + Missoula County) could reveal active litigation interests to an observer with LawGlance log access. | LawGlance | LOW | 3.8 |

### 1.5 Denial of Service (D) — Availability Disruption

| ID | Threat | Target Component | Severity | CVSS ~ |
|---|---|---|---|---|
| D-01 | **SearXNG single point of failure.** All agent search traffic routes through a single private SearXNG instance. If it fails or is overloaded, the entire research pipeline halts. | SearXNG | HIGH | 6.8 |
| D-02 | **n8n single point of failure for all HITL gates.** Every external-facing action requires n8n approval routing. n8n downtime blocks publication, referral transmission, intake acceptance, and OSINT authorization. | n8n | HIGH | 6.9 |
| D-03 | **OpenClaw task queue flooding.** A compromised Hermes or malicious operator could enqueue thousands of high-complexity research tasks, exhausting LiteLLM API budgets, OpenShell sandbox capacity, and MCAS connection pools. | OpenClaw / crewAI | MEDIUM | 5.6 |
| D-04 | **Elasticsearch/Qdrant/Neo4j dependency cascade.** The Legal Source Gateway depends on three separate data stores. Loss of any one disrupts case law search, semantic retrieval, or citation graph traversal. | Legal Source Gateway backends | MEDIUM | 5.5 |
| D-05 | **External messaging service outages block HITL.** If Telegram or Discord experiences an outage, operators cannot receive approval requests, causing workflow stalls and missed legal deadlines. | Telegram / Discord | MEDIUM | 5.1 |
| D-06 | **Cloud LLM rate-limiting or API suspension.** If OpenAI or Anthropic suspends the platform API key (e.g., due to policy violation detection or billing issue), all cloud-dependent agents fail with no graceful degradation documented beyond "fallback to Ollama." | LiteLLM / Cloud providers | MEDIUM | 5.3 |

### 1.6 Elevation of Privilege (E) — Unauthorized Access Expansion

| ID | Threat | Target Component | Severity | CVSS ~ |
|---|---|---|---|---|
| E-01 | **Paperclip integration incomplete (SPEC.md Gap).** Paperclip is the designated control plane for agent lifecycle and policy enforcement, but the SPEC lists "Paperclip integration" as a high-priority unimplemented gap. Without it, agents may run without verified policy manifests, enabling role bypass. | Paperclip / OpenClaw | CRITICAL | 8.2 |
| E-02 | **crewAI ↔ OpenClaw bridge unimplemented (SPEC.md Gap).** The dispatcher mapping OpenClaw payloads to crewAI invocations is not built. In the interim, tasks may be dispatched directly to crewAI without OpenClaw policy checks, bypassing sandbox provisioning and classification ceilings. | OpenClaw / crewAI | CRITICAL | 8.0 |
| E-03 | **MemoryPalace classification enforcement unverified (SPEC.md Gap).** The SPEC explicitly flags that MemoryPalace's native classification ceiling enforcement needs verification against the Paperclip policy model. Until verified, agents may write Tier-1 content to persistent memory. | MemoryPalace | HIGH | 7.4 |
| E-04 | **Vane T4-admin token without RBAC.** Vane holds the T4-admin token and is reachable on the internal network at `:3001`. Without upstream authentication, any user or compromised container on the internal network can access all SearXNG engine groups, including T3 PI-tier OSINT databases. | Vane / SearXNG | HIGH | 7.5 |
| E-05 | **n8n basic auth weakness.** The README setup example shows n8n launched with `N8N_BASIC_AUTH_ACTIVE=true` and a plaintext password. Basic auth transmits credentials in Base64 with every request; without HTTPS enforcement, this is trivially interceptable. | n8n UI | MEDIUM | 6.0 |
| E-06 | **Hermes subagent spawn TTL mismatch.** POLICY.md specifies a 300-second TTL cap for subagents, but GUARDRAILS.yaml (`G-TOOL-PRE-003`) caps TTL at 600 seconds. This discrepancy creates an elevation window where a subagent lives longer than policy intends. | Hermes / OpenShell | LOW | 4.2 |
| E-07 | **LawGlance "no auth" for internal agents.** The inter-service protocol map shows LangChain agents → LawGlance uses "HTTP/REST | Internal only (no auth)." If network segmentation fails or an attacker pivots to the internal network, LawGlance is fully accessible. | LawGlance | MEDIUM | 5.5 |
| E-08 | **OpenShell sandbox policy escape via YAML injection.** OpenShell policies are hot-reloadable YAML. If an attacker can write to the policy directory (e.g., via a compromised agent with filesystem access to the host), they could inject a permissive policy and escape sandbox isolation. | OpenShell / NemoClaw | HIGH | 7.1 |

---

## 2. Privacy and Anonymity Risks for Clients and Attorneys

### 2.1 Survivor / Complainant Risks

**CRITICAL — Cloud LLM Prompt Retention (Risk P-01):**
The platform routes agent inference through cloud LLM providers (OpenAI `gpt-4o`, Anthropic `claude-3-5-haiku`). While the OpenShell inference-routing layer strips caller credentials, it does **not** strip the semantic content of prompts. Tier-0 data is nominally excluded from the agent pipeline, but Tier-1 pseudonymous matter references, chronology events, and legal element matrices routinely enter agent context windows. Under OpenAI's and Anthropic's standard terms, prompt data may be retained for 30 days for abuse monitoring and, unless an Enterprise Privacy Agreement is negotiated, may be used for model training. For survivors of domestic violence and police misconduct, this creates:
- **Re-identification risk:** A prompt like "Analyze § 1983 excessive force claim against Officer J. Doe, Missoula County, March 2024, involving YWCA shelter transfer" contains enough quasi-identifiers to enable re-identification.
- **Privilege waiver:** If any attorney-client communication or work-product reasoning enters the prompt context, privilege may be waived under Montana and federal evidence rules.

**HIGH — Aggregation and Inference Attacks (Risk P-02):**
Multiple agents querying OpenRAG, MCAS, and SearXNG for the same matter leave query patterns across logs. An attacker (or malicious insider) with read access to the audit stream could correlate:
- Rae's legal research on "qualified immunity + Missoula County"
- Iris's T3 OSINT on "Officer J. Doe + POST records + 2024"
- Atlas's case milestone tracking for matter `MCAS-0042`
- Avery's intake timestamp for a DV shelter referral
This aggregation could reconstruct the complainant's identity even if no single query contains PII.

**HIGH — Document Metadata Leakage (Risk P-03):**
Avery performs OCR and document classification on intake evidence. PDFs, images, and Word documents often contain metadata (author name, GPS coordinates, creation date, editing history, camera serial numbers). If the OCR pipeline does not strip metadata before storing in MCAS or OpenRAG, a Tier-2 "de-identified" document could still leak a survivor's location or identity through embedded metadata.

**MEDIUM — Social Media Timing Correlation (Risk P-04):**
The Social Media Manager publishes campaign content across X, Bluesky, Reddit, and Nostr. Even with redacted content, the timing of posts about a "Missoula County pattern-of-practice investigation" could be correlated with public records (e.g., a recent lawsuit filing) to infer the underlying complainant's timeline and identity.

### 2.2 Attorney / Volunteer Advocate Risks

**CRITICAL — Attorney-Client Privilege Waiver via Cloud Tracing (Risk P-05):**
LangSmith traces capture the full agent reasoning chain, including tool outputs from MCAS, MemoryPalace retrieval, and OpenRAG search. If an attorney's mental impressions or case strategy are reflected in agent prompts or retrieved context, those traces are stored in LangSmith's cloud SaaS. In litigation, an adversary could subpoena LangSmith records (if they become aware of the platform's use) or argue that storing privileged content with a third party constitutes a waiver of privilege.

**HIGH — Operator Anonymity Exposure (Risk P-06):**
The platform relies on volunteer attorneys who require anonymity from institutional retaliation. However:
- Hermes CLI sessions, Telegram messages, and Discord alerts contain operator handles and timestamps.
- n8n approval logs record operator ID and approval decisions.
- Git commit history (for skill factory activations, policy updates) contains GitHub usernames and email addresses.
- If the public repository is forked or starred by an identifiable operator account, their affiliation with MISJustice Alliance becomes public.

**MEDIUM — Referral Packet Interception (Risk P-07):**
Casey assembles referral packets for transmission to outside counsel. These packets transit from MCAS → Open Notebook → AgenticMail → external email. If TLS downgrade or SMTP misconfiguration occurs, packet contents could be intercepted in transit. The DATA_CLASSIFICATION.md policy requires de-identification to Tier-2 minimum, but a misconfigured export or human error could include Tier-1 matter identifiers.

### 2.3 Institutional Actor / Third-Party Risks

**MEDIUM — OSINT Scope Creep and Defamation Exposure (Risk P-08):**
Iris conducts T3 PI-tier OSINT on named public officials. If NemoClaw rails fail or an operator overrides a block, Iris could query prohibited fields (home address, family relationships) or conduct surveillance-adjacent aggregation. The resulting output, if leaked or published without adequate redaction, creates:
- Defamation/libel exposure if inaccurate misconduct allegations are published.
- Safety risk if private addresses or family details are inadvertently included in internal memos that later leak.
- CFAA exposure if any OSINT source requires authentication or terms-of-service acceptance that the automated query violates.

---

## 3. Data Classification and Access Control Gaps

### 3.1 Classification Enforcement Gaps

| Gap ID | Description | Severity | Evidence |
|---|---|---|---|
| DCG-01 | **MemoryPalace classification ceiling unverified.** SPEC.md §23 lists this as a known gap: "MemoryPalace's native classification ceiling enforcement needs to be verified against the Paperclip policy model; may require a middleware." Without verified enforcement, agents may persist Tier-1 content to cross-session memory. | HIGH | SPEC.md §23 |
| DCG-02 | **No automatic DLP scanning at egress.** There is no documented data-loss-prevention layer scanning referral packets, AgenticMail drafts, or Open Notebook exports for residual PII before external transmission. Human review is the only control. | HIGH | Absence in architecture docs |
| DCG-03 | **Vane lacks upstream RBAC for file upload.** Vane's security note explicitly states: "Upstream authentication and role-based access control are required before Tier-0/1 use." Until implemented, Vane's T4-admin token is usable by anyone who can reach the endpoint. | HIGH | `services/vane/vane.yaml` |
| DCG-04 | **No automated classification at intake.** Avery proposes a Tier classification for uploaded evidence, but human confirmation is required. During the window between upload and confirmation, evidence may reside in MCAS or OCR scratch space without proper classification tags. | MEDIUM | README.md §4, AGENTS.md |
| DCG-05 | **Downward reclassification lacks dual-control.** A single human operator can reclassify Tier-1 → Tier-2 → Tier-3. There is no segregation of duties requiring a second operator or Veritas audit confirmation before de-identified content is approved for publication. | MEDIUM | `policies/DATA_CLASSIFICATION.md` §297–328 |
| DCG-06 | **LawGlance has no authentication.** The protocol map shows LangChain agents → LawGlance as "Internal only (no auth)." This relies entirely on network segmentation, with no application-layer access control if segmentation fails. | MEDIUM | SPEC.md §20 Inter-Service Communication |

### 3.2 Access Control Gaps

| Gap ID | Description | Severity | Evidence |
|---|---|---|---|
| ACG-01 | **Paperclip control plane not integrated.** The SPEC lists Paperclip integration as a high-priority unimplemented gap. Without Paperclip enforcing agent manifests and policy files, agents run with only YAML-defined controls that are not dynamically enforced by a control plane. | CRITICAL | SPEC.md §23 |
| ACG-02 | **crewAI ↔ OpenClaw bridge unimplemented.** Tasks may be dispatched to crewAI without passing through OpenClaw's task queue, sandbox provisioning, or audit logging. This bypasses the entire protection layer for multi-agent workflows. | CRITICAL | SPEC.md §23 |
| ACG-03 | **No fine-grained MCAS field-level RBAC.** The MCAS API contract lists OAuth2 scopes like `document:read:tier2`, but there is no evidence of field-level access control within a tier. An agent with Tier-2 read access can read all Tier-2 fields, not just those relevant to its role. | MEDIUM | SPEC.md §15 |
| ACG-04 | **Open Notebook access control undefined.** Open Notebook is referenced as a storage destination for Tier-2 and Tier-3 content, but no RBAC model, sharing rules, or workspace isolation are documented. | MEDIUM | Absence in docs |
| ACG-05 | **n8n approval workflow lacks multi-operator consensus.** For high-risk gates (publication, referral transmission, pattern-of-practice findings), a single operator approval is sufficient. There is no documented requirement for dual approval or Human Oversight Board (HOB) consensus. | MEDIUM | README.md §4 |
| ACG-06 | **AgenticMail outbound access not restricted.** Ollie uses AgenticMail for outreach drafts and logging, but there is no documented allowlist of recipient domains or DLP scanning to prevent accidental transmission to wrong addresses. | LOW | README.md agent table |

### 3.3 Cryptographic & Secrets Management Gaps

| Gap ID | Description | Severity | Evidence |
|---|---|---|---|
| SMG-01 | **Environment variables contain high-value secrets.** `.env.example` shows tokens for OpenAI, Anthropic, SearXNG T4-admin, Neo4j password, and n8n basic auth. The platform claims secrets should be in HashiCorp Vault, but the `.env.example` and setup instructions normalize flat-file secret management. | HIGH | `.env.example`, README.md §12 |
| SMG-02 | **No documented HSM or KMS for Tier-0/1 encryption keys.** AES-256 encryption at rest is mentioned, but key generation, rotation, and storage are not tied to a hardware security module or cloud KMS with IAM-bound decryption. | MEDIUM | SPEC.md §18 |
| SMG-03 | **mTLS certificate lifecycle undocumented.** The zero-trust model relies on internal mTLS between services. There is no documented CA rotation policy, certificate expiry monitoring, or revocation procedure for compromised service identities. | MEDIUM | SPEC.md §18 |
| SMG-04 | **Neo4j password in plaintext env var.** `NEO4J_PASSWORD=<password>` is shown in `.env.example`. Neo4j Bolt+TLS is mentioned, but password-based auth is weaker than x.509 client certificate auth. | LOW | `.env.example` |

---

## 4. Specific Security Recommendations with Implementation Priority

### 4.1 P0 — Critical (Block Production Launch)

| ID | Recommendation | Owner | STRIDE Mapping |
|---|---|---|---|
| SEC-001 | **Negotiate Enterprise Privacy Agreements with OpenAI and Anthropic** before routing any matter-adjacent prompts to their APIs. Agreements must prohibit model training on platform data, mandate 0-day retention, and provide audit rights. If agreements are unavailable, **air-gap all Tier-1+ agent inference to Ollama/local models exclusively.** | Platform Lead / Legal | I-01, P-01, P-05 |
| SEC-002 | **Self-host LangSmith or migrate to Langfuse** deployed on-platform. Until then, **disable LangSmith tracing (`LANGCHAIN_TRACING_V2=false`) for all production agents** that touch Tier-1+ data. Tracing may be re-enabled only for public-legal research agents (Citation Agent on T1-publicsafe). | DevOps / Security | I-02, P-05 |
| SEC-003 | **Implement the Paperclip control-plane integration and crewAI ↔ OpenClaw bridge** before any agent runs in production. These are architectural prerequisites for policy enforcement and sandbox provisioning. Running without them invalidates the zero-trust model. | Platform Engineering | E-01, E-02 |
| SEC-004 | **Replace n8n URL query-param tokens with HMAC-signed POST bodies or stateful session cookies.** Approval URLs must not contain bearer tokens. Implement CSRF protection and one-time nonce validation for all HITL approval endpoints. | Security / n8n Admin | S-03, R-01 |
| SEC-005 | **Add upstream authentication and RBAC to Vane** before allowing any operator access. Vane must authenticate operators via the same API-key+TOTP flow as Hermes and enforce per-operator search tier limits (no blanket T4-admin). File upload must be scanned for metadata and classified automatically. | Platform Engineering | E-04, DCG-03 |

### 4.2 P1 — High (Implement Within 30 Days of Launch)

| ID | Recommendation | Owner | STRIDE Mapping |
|---|---|---|---|
| SEC-006 | **Build and verify the MemoryPalace classification middleware** referenced in SPEC.md §23. All memory writes must be inspected by a policy-enforcement sidecar before commit. Cross-matter memory must require explicit HOB authorization. | Agent Engineering | E-03, DCG-01 |
| SEC-007 | **Deploy a DLP scanning layer at all egress boundaries:** AgenticMail outbound, referral packet export, GitBook sync, and social media posting. Use regex + ML-based PII detection to catch residual identifiers, metadata, and privileged content. | Security / DevOps | DCG-02 |
| SEC-008 | **Implement cryptographic non-repudiation for HITL approvals.** Sign approval events with the operator's private key (stored in a platform HSM/session key) and append signatures to the Veritas audit stream. | Security / n8n Admin | R-01 |
| SEC-009 | **Harden n8n:** (a) Replace basic auth with OIDC/OAuth2 integration; (b) enforce HTTPS-only access; (c) run n8n in its own isolated Kubernetes namespace with NetworkPolicies restricting ingress to Hermes and OpenClaw only; (d) enable workflow execution audit logging to an immutable store. | DevOps / Security | E-05, T-04 |
| SEC-010 | **Add authentication to LawGlance.** Even if intended for internal use only, implement mTLS client certificate auth or at minimum API-key validation. Do not rely solely on network segmentation. | Legal Source Gateway Team | E-07 |
| SEC-011 | **Deploy a secrets manager (HashiCorp Vault or equivalent)** and migrate all `.env` secrets to dynamic, short-lived credentials with automatic rotation. Inject secrets via init containers or CSI driver, never as environment variables. | DevOps / Security | SMG-01 |
| SEC-012 | **Implement query-log anonymization for T3 audit logs.** Store matter IDs and target identities in a separate encrypted index linked by synthetic correlation ID. Veritas can correlate when needed, but a bulk audit-log leak does not directly expose PI-tier targets. | Security / MCAS Team | I-04 |
| SEC-013 | **Add redundant SearXNG instances** with load balancing and health checks. If the primary instance fails, agents must fail over automatically without manual intervention. | DevOps | D-01 |
| SEC-014 | **Implement rate limiting and budget caps at OpenClaw.** Enforce per-matter, per-agent, and per-operator query budgets to prevent queue flooding and cost exhaustion. | Platform Engineering | D-03 |

### 4.3 P2 — Medium (Implement Within 90 Days)

| ID | Recommendation | Owner | STRIDE Mapping |
|---|---|---|---|
| SEC-015 | **Establish an immutable audit log backbone.** Deploy a centralized logging architecture (e.g., Fluent Bit → Kafka → ClickHouse/Elasticsearch with WORM storage class) for all audit events. Retain hashes in a tamper-evident structure (Merkle tree or periodic blockchain anchor). | Security / DevOps | R-02 |
| SEC-016 | **Implement dual-control for high-risk HITL gates.** Publication approval, referral transmission, and pattern-of-practice findings require approval from **two** operators or one operator plus Veritas compliance confirmation before execution. | Platform Governance | ACG-05 |
| SEC-017 | **Add metadata stripping to the intake OCR pipeline (Avery/Chandra).** Before storing any document in MCAS or OpenRAG, strip EXIF, GPS, author fields, revision history, and embedded macros. Log metadata removal as an audit event. | Agent Engineering | P-03 |
| SEC-018 | **Deploy network policies (Kubernetes) or eBPF micro-segmentation** to enforce the service topology diagram in SPEC.md §19. Only explicitly allowed inter-service paths should be routable; all others blocked by default. | DevOps / Security | E-07, I-07 |
| SEC-019 | **Conduct a red-team exercise against the OpenShell sandbox.** Attempt YAML injection, policy hot-reload abuse, and syscall escape. Harden the gateway to validate policy cryptographic signatures before applying hot reloads. | Security | T-02, E-08 |
| SEC-020 | **Implement vector-store access obfuscation for OpenRAG.** Add differential privacy noise to embedding queries or use secure multi-party computation for retrieval to mitigate embedding inversion attacks. | Research / Security | I-03 |
| SEC-021 | **Add AgenticMail domain allowlists and recipient confirmation.** Outbound emails may only be sent to pre-verified attorney domains, civil-rights orgs, and internal addresses. Novel recipients require HITL approval. | Platform Engineering | ACG-06 |
| SEC-022 | **Document and automate mTLS certificate lifecycle management.** Deploy cert-manager in Kubernetes with automatic rotation, expiry alerting, and revocation distribution. | DevOps | SMG-03 |
| SEC-023 | **Add a confidential-computing enclave or trusted execution environment (TEE)** for Tier-1 agent inference if cloud LLM usage is unavoidable. Intel TDX, AMD SEV-SNP, or AWS Nitro Enclaves can protect prompt data from cloud provider access. | Security / Cloud Architecture | I-01 |

### 4.4 P3 — Low / Hardening (Ongoing)

| ID | Recommendation | Owner | STRIDE Mapping |
|---|---|---|---|
| SEC-024 | **Move the public repository to private** or sanitize architecture docs to reduce adversarial reconnaissance surface. If public visibility is required for transparency, publish a high-level whitepaper and keep detailed topology diagrams internal. | Platform Governance | I-07 |
| SEC-025 | **Add a trusted timestamp authority (TSA)** to all audit events for non-repudiation and legal admissibility. | Security | R-05 |
| SEC-026 | **Standardize operator anonymity practices.** Use pseudonymous platform handles, ProtonMail accounts for Git, and VPN/Tor for public repository access. Document operational-security procedures in a classified runbook. | Human Oversight Board | P-06 |
| SEC-027 | **Implement chaos engineering** for SearXNG, n8n, and MCAS to validate graceful degradation and failover behavior before production load. | DevOps | D-01, D-02, D-04 |
| SEC-028 | **Add automated pre-commit secret scanning** (TruffleHog + GitLeaks) and block pushes containing high-entropy strings, PEM keys, or known API key patterns. | DevOps / Security | SMG-01 |

---

## 5. Compliance Considerations for Legal Data Handling

### 5.1 Attorney-Client Privilege & Work-Product Doctrine

**Risk:** Any Tier-0 attorney-client communication or Tier-1 work-product that enters a cloud LLM prompt, LangSmith trace, or third-party SaaS may be deemed a waiver of privilege under *Montana Rule of Evidence 502* and federal precedent.

**Controls Required:**
- **Air-gapped inference** for any agent processing Tier-1+ content. Ollama on-premises must be the default for Rae, Lex, and Iris; cloud LLMs restricted to Citation Agent (public legal info only) and Sol (public-safe QA).
- **Privilege logs** maintained in MCAS documenting which agents touched privileged content and under what human authorization.
- **Upjohn warnings** in intake flows: complainants must be informed that AI agents process their de-identified intake data, and that attorney communications are handled exclusively via Proton E2EE, never through the agent pipeline.

### 5.2 Unauthorized Practice of Law (UPL)

**Risk:** The platform's stated mission includes "producing litigation-ready outputs" and "referral packet assembly." If agents provide individualized legal advice, case strategy, or outcome predictions, the platform and its operators risk UPL charges under Montana Code Annotated § 37-61-201 and Washington State RCW 2.48.180.

**Controls Required:**
- **Hard-coded disclaimer injection** (already partially implemented via GUARDRAILS.yaml `G-OUT-001`) on every agent output that touches legal analysis.
- **Annual UPL compliance audit** by a licensed Montana/Washington attorney reviewing agent system prompts, output samples, and HITL gate logs.
- **No autonomous referral transmission** without attorney review. Casey referral packets must be reviewed by a licensed attorney before transmission, not merely an operator.

### 5.3 Montana Consumer Data Privacy Act (MCDPA) & Washington State Privacy Law

**Risk:** Montana residents' personal data is processed by the platform. The MCDPA (effective October 2024) requires data minimization, purpose limitation, consumer rights (access, deletion, portability), and opt-out of targeted advertising/profiling. Washington's My Health My Data Act (if health data is involved) imposes additional strictures.

**Controls Required:**
- **Data Processing Addenda (DPAs)** with all subprocessors (OpenAI, Anthropic, LangSmith, Telegram, Discord, GitBook, Proton).
- **Consumer rights request workflow:** A human operator must be able to export, correct, or delete a complainant's data within 45 days of request. This must propagate across MCAS, OpenRAG, MemoryPalace, and SearXNG logs.
- **Opt-out mechanism:** Complainants must be able to opt out of AI-agent processing of their de-identified data (Tier-2 research) while still receiving human-only advocacy support.

### 5.4 Computer Fraud and Abuse Act (CFAA) & OSINT Compliance

**Risk:** Iris's T3 OSINT queries access public databases. Automated querying at volume may violate terms of service (ToS) of sources like CourtListener, CAP, or state bar registries. The U.S. Department of Justice's 2022 CFAA policy states that good-faith security research is not prosecuted, but unauthorized scraping in violation of ToS remains legally ambiguous.

**Controls Required:**
- **ToS review for every OSINT source.** Maintain a legal memorandum documenting authorized use for each engine group.
- **Rate-limit compliance:** The Legal Source Gateway must enforce per-source rate limits that stay within authorized use parameters.
- **No authentication bypass:** Absolute prohibition on querying sources that require account creation or API-key agreement unless the platform has a valid agreement.

### 5.5 Breach Notification & Incident Response

**Risk:** `DATA_CLASSIFICATION.md` references the MCDPA notification requirement but delegates the assessment to "the supervising attorney." This creates a single-point-of-failure and potential delay.

**Controls Required:**
- **Pre-drafted breach notification templates** for Montana Attorney General, Washington State Attorney General, and affected complainants.
- **72-hour internal notification SLA** from discovery to Human Oversight Board; 24-hour notification if Tier-0 data is involved.
- **Annual tabletop exercise** simulating a Tier-0 data leak to git, cloud LLM provider, or OSINT source compromise.

### 5.6 NIST SP 800-88 & Data Destruction

**Risk:** The platform commits to NIST SP 800-88 compliant secure deletion for Tier-0 data. However, cloud LLM providers, LangSmith, and vector stores (Qdrant, OpenSearch) may retain data in backups, replicas, or training snapshots beyond platform-controlled deletion.

**Controls Required:**
- **Subprocessor destruction attestations** in all DPAs requiring certification of data purging within 30 days of platform deletion request.
- **Crypto-shredding for Tier-0 fields:** Encrypt Tier-0 fields with keys held only by the supervising attorney; destruction of the key renders the ciphertext unrecoverable even if backups persist.
- **Quarterly restoration test** from backups to verify that deleted data does not reappear during disaster recovery.

### 5.7 Litigation Hold & e-Discovery

**Risk:** When a matter is placed on litigation hold, all data must be preserved. Agents with automated retention/deletion schedules (MemoryPalace cross-matter review, n8n scheduled purges) could inadvertently destroy hold-covered data.

**Controls Required:**
- **Litigation hold flag propagation:** When MCAS sets `litigation_hold: true`, the flag must cascade to OpenRAG, MemoryPalace, n8n, and all backup systems to suspend automated deletion.
- **Legal hold audit trail:** Document every hold event, including who applied it, when, and what systems were notified.
- **e-Discovery export capability:** The platform must be able to produce all agent outputs, audit logs, and HITL decisions for a given matter in a reviewable format (e.g., load file for Relativity/Concordance).

---

## 6. Risk Summary Matrix

| Category | CRITICAL | HIGH | MEDIUM | LOW |
|---|---|---|---|---|
| **Spoofing** | — | 2 | 3 | 1 |
| **Tampering** | 1 | 3 | 1 | 1 |
| **Repudiation** | — | 2 | 2 | 1 |
| **Info Disclosure** | 2 | 2 | 3 | 2 |
| **Denial of Service** | — | 2 | 4 | — |
| **Elevation of Privilege** | 2 | 3 | 2 | 1 |
| **Privacy / Anonymity** | 2 | 3 | 2 | — |
| **Compliance** | 1 | 3 | 2 | — |

**Overall Platform Security Posture:** **MODERATE — HIGH RISK** for production deployment without P0 remediations.

The architecture is conceptually sound and security-aware, but the current implementation gaps (especially unintegrated control plane, cloud LLM exposure, and missing authentication layers) create attack paths that could compromise the exact populations the platform exists to protect. **Do not process live complainant data until SEC-001 through SEC-005 are implemented and penetration-tested.**

---

## ACCEPTANCE CRITERIA

The following validation steps must be completed before this report is considered addressed:

1. **Cloud LLM Air-Gap Verification:** Demonstrate that Tier-1+ agent prompts do not transit to OpenAI/Anthropic by intercepting LiteLLM egress traffic in a staging environment. Provide packet captures or proxy logs showing local-Ollama-only routing for Rae/Lex/Iris.

2. **LangSmith Tracing Disabled:** Confirm `LANGCHAIN_TRACING_V2=false` in production agent configurations. Verify no Tier-1+ agent execution traces appear in the LangSmith cloud project for a 7-day observation period.

3. **Paperclip Integration Test:** Execute an end-to-end workflow (intake → research → publication) with Paperclip enforcing agent manifests. Attempt to dispatch a task to an agent with a modified policy and confirm Paperclip blocks the dispatch.

4. **n8n Approval URL Security:** Inspect n8n webhook URLs generated for HITL gates. Confirm no bearer tokens appear in query parameters; confirm HMAC signatures or session-cookie-based auth is in use; confirm CSRF tokens are validated.

5. **Vane RBAC Enforcement:** Attempt to access Vane without authentication from a fresh browser session. Confirm redirect to login. Log in as an operator with Tier-2 clearance and confirm T4-admin engine groups are inaccessible.

6. **MemoryPalace Classification Middleware:** Write a test agent that attempts to persist Tier-1 content to MemoryPalace. Confirm the write is rejected by the middleware and logged to Veritas.

7. **DLP Egress Scanning:** Attempt to export a test referral packet containing synthetic PII (SSN pattern, email, phone) via the AgenticMail pipeline. Confirm the DLP layer blocks the export and alerts the operator.

8. **Secrets Manager Migration:** Confirm zero secrets in environment variables or `.env` files on production hosts. Confirm all service-to-service auth uses short-lived tokens injected by Vault/CSI.

9. **Penetration Test Report:** Engage a third-party security firm to conduct a red-team exercise against the production-like staging environment. Provide a report with no CRITICAL or HIGH findings unresolved.

10. **Legal Compliance Sign-Off:** Obtain written attestation from a licensed Montana/Washington attorney that the platform's data handling, privilege protection, and UPL safeguards meet applicable ethical and legal standards.

---

*Report generated by Security Engineer Agent — MISJustice Alliance Firm*  
*Classification: Tier 2 — Internal*  
*Review cycle: 90 days or upon material architectural change*
