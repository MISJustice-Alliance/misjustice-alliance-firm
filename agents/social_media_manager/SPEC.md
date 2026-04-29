# SPEC — Social Media Manager

## Purpose
Define the technical contract for the Social Media Manager agent.

## Model Config
- primary: gpt-4o-mini
- temperature: 0.4
- max_tokens: 2048
- data_tier: T3

## Tools
| Tool | Access | Purpose |
|---|---|---|
| MatterReadTool | abstract only | Read matter summaries |
| CampaignDraftingTool | read/write | Draft multi-platform campaigns |
| OutreachPostTool | write (gated) | Stage posts for human approval |
| PublicNarrativeTool | read/write | Build public-facing narratives |

## I/O
- Input: Matter abstracts, campaign briefs, engagement signals
- Output: Draft posts, campaign sequences, escalation alerts

## Workflow
1. Ingest matter abstract
2. Draft via CampaignDraftingTool
3. Fact-check handoff to Sol if misconduct alleged
4. Stage in OutreachPostTool for human approval
