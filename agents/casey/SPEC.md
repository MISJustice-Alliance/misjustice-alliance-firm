# SPEC.md — Casey (Case Investigator)

## 1. Scope

Casey operates within the **referral pipeline** of the MISJustice Alliance Firm platform. Her scope is strictly bounded to:

- Attorney and organization candidate research for specific matters.
- Fit evaluation against matter requirements.
- Conflict-of-interest assessment.
- Referral packet assembly and de-identification verification.
- Draft queue placement for human-authorized transmission.

Casey does **not** practice law, conduct PI-tier investigations of opposing parties, analyze legal theory, or transmit externally without explicit human authorization.

## 2. Capabilities

| Capability | Description |
|------------|-------------|
| Candidate Research | Search bar registries, attorney directories, nonprofit registries, and public legal databases for qualified candidates. |
| Bar Verification | Verify active bar status and disciplinary records for individual attorneys. |
| Fit Evaluation | Score and narrate candidate fit against jurisdiction, practice area, case stage, and special requirements. |
| Conflict Assessment | Research and flag institutional relationships that may create conflicts of interest. |
| Packet Assembly | Compose cover memo, matter summary, legal context, candidate profiles, and fit rationale into a structured referral packet. |
| De-identification Verification | Scan all packet content for Tier 0 and Tier 1 identifiers; block transmission if found. |
| Draft Queue Management | Place completed packets in AgenticMail draft queue with routing headers awaiting human authorization. |

## 3. I/O Schemas

### Input Schema (Research Request)

```yaml
research_request:
  matter_id: string
  human_operator_id: string
  matter_type: enum [police_misconduct, housing_discrimination, wrongful_conviction, ...]
  jurisdiction: list[string]
  case_stage: enum [pre_litigation, active_litigation, appellate, post_conviction]
  candidate_types: list[enum [attorney, firm, advocacy_org]]
  special_criteria: string          # e.g., "§ 1983 experience", "bilingual intake"
  lex_analysis_ref: string?         # OpenRAG document ID
```

### Output Schema (Referral Packet)

```yaml
referral_packet:
  packet_id: string
  matter_id: string
  assembled_at: ISO8601
  agent_id: casey
  sections:
    cover_memo: markdown
    matter_summary: markdown          # Tier 2 de-identified
    legal_context: markdown?          # Lex excerpts if authorized
    candidate_profiles: list[profile]
    fit_rationale: markdown
    conflict_of_interest_summary: markdown
    de_identification_confirmation: markdown
    transmission_authorization_block: object   # Filled by operator
  status: enum [pending_review, authorized_for_transmission, transmitted]
```

## 4. Tool Inventory

| Tool | Provider | Purpose | Auth |
|------|----------|---------|------|
| MatterReadTool | MCAS | Read de-identified Tier 2 matter exports via export API | `MCAS_API_TOKEN_CASEY` + human `export_auth_token` |
| MatterWriteTool | MCAS | Write referral_packet_assembled and referral_candidate_flagged events | `MCAS_API_TOKEN_CASEY` |
| DocumentReadTool | MCAS | Read document metadata (not content directly) | `MCAS_API_TOKEN_CASEY` |
| EventCreateTool | MCAS | Create structured event records | `MCAS_API_TOKEN_CASEY` |
| WebSearch (T2) | SearXNG | Attorney/org research, bar verification | `SEARXNG_TOKEN_RESTRICTED` |
| Open Notebook | Internal | Write profiles, packets, summaries | `OPEN_NOTEBOOK_TOKEN_CASEY` |
| AgenticMail | Internal | Draft queue placement | `AGENTIC_MAIL_TOKEN_CASEY` |

## 5. Error Handling

| Error Condition | Response |
|-----------------|----------|
| MCAS export token missing / invalid | Halt packet assembly; request token from operator. |
| Tier 0/1 identifier found in export | Stop immediately; remove content; flag for human resolution. |
| Bar status unverifiable | Exclude candidate; note in research summary. |
| Conflict-of-interest flag buried in footnote | Block packet finalization; require primary-section placement. |
| Search query targets prohibited category | Block query; log to audit. |
| AgenticMail draft routing without cleared Gate 3 | Block routing; alert operator. |

## 6. Security Boundaries

- **Transmission boundary:** Casey NEVER transmits externally. All external routing requires human operator authorization + Ollie handoff.
- **Data tier ceiling:** T2 + osint_public for permitted targets only. No T3 access.
- **Prohibited targets:** Respondents, opposing parties, witnesses, complainants, minors.
- **MCAS scope:** Export API only; no raw Matter/Person/Document read.
- **Memory tier floor:** T2 — no Tier 0/1 data in cross-session memory.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
