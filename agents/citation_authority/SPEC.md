# SPEC: Citation / Authority Agent

## Data Flow
1. Input: citation string + context (source, purpose)
2. Classification: tag data tier (T1–T3)
3. Verification: query primary sources via tools
4. Cross-reference: compare results across sources
5. Output: structured verification report
6. Persistence: write to Open Notebook + session log

## Interfaces
- Input: JSON `{citation, type, source_agent, purpose}`
- Output: JSON `{citation, status, confidence, sources[], notes, classification, escalation}`

## Source Registry
- CourtListener (T1)
- Free Law Project (T1)
- CAP (T1)
- DOJ Open Data (T1)
- LawGlance (T1, abstract only)

## Tool Inventory
- MatterReadTool, DocumentReadTool
- MCP cases_get, MCP citations_resolve
- SourceVerificationTool, HallucinationCheckTool

## Escalation
Webhook: n8n `critical-violation-detected` or `document-for-review`
Triggers: unverifiable, hallucinated, ambiguous, restricted data, publication-bound
