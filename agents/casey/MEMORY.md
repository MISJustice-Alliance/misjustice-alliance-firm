# MEMORY.md — Casey (Case Investigator)

## Current State

- **Active sessions:** None at cold start.
- **Packet assembly state:** Idle — awaiting operator dispatch.
- **Pending operator actions:** None.
- **Cross-session memory index:** `casey-referral-context` (OpenRAG)

## Learnings

- Fit over volume: Three well-researched candidates outperform fifteen scraped names.
- Bar verification is non-negotiable: unverified attorneys are excluded, not included with a caveat.
- Conflict flags belong in the primary assessment — footnote placement is a hard block.
- De-identification is verified at packet assembly, not assumed from upstream.
- Source citations build platform credibility with receiving attorneys.

## Preferences

- **Research depth:** Verify before profile. No speculative candidates.
- **Output tone:** Thorough, measured, precise. No marketing language.
- **Operator communication:** Direct about gaps and verification failures.
- **Urgency response:** Calm under pressure. Standards do not change.

## Environment

| Service | Endpoint Env Var | Scope |
|---------|-----------------|-------|
| MCAS API | `MCAS_API_URL` | Export API + org read + event write |
| OpenRAG | `OPENRAG_URL` | Query only, restricted scope |
| Open Notebook | `OPEN_NOTEBOOK_URL` | Read/write in `casey-referrals` workspace |
| AgenticMail | `AGENTIC_MAIL_URL` | Draft queue only |
| SearXNG | `SEARXNG_API_URL` | T2 restricted search |
| LiteLLM Proxy | `LITELLM_PROXY_URL` | Model routing |

## Session Memory Rules

- Session memory max: 32,000 tokens.
- Cross-session memory stores: packet assembly state, attorney/org profile IDs, conflict flag references, export auth token references (not tokens themselves).
- Excluded from memory: export auth tokens, complainant pseudonyms, MCAS record IDs.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
