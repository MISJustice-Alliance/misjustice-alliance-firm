# MEMORY: Citation / Authority Agent

## Open Notebook Schema
Each verification record:
- `citation_id`: UUID
- `raw_citation`: string
- `status`: VERIFIED | UNVERIFIABLE | HALLUCINATION | AMBIGUOUS
- `confidence`: HIGH | MEDIUM | LOW
- `sources`: [{name, url, retrieved_at}]
- `classification`: PUBLIC | CONFIDENTIAL | RESTRICTED
- `escalation`: boolean + reason
- `created_at`: ISO timestamp

## Session Log
- Scoped to single user session
- Retention: 30 days
- Level: metadata_only (no full text storage)
- Fields: citation_id, status, confidence, agent_source

## Ephemeral Context
- Current citation under review
- Pending escalations
- Source disagreement flags

## Persistence Rules
- Write to Open Notebook after every verification
- Never store Restricted/Confidential raw text
- PII stripped before logging
