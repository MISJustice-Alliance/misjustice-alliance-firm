# Wiki Schema

## Domain
MISJustice Alliance Firm — a zero-human company (ZHC) and AI agent legal advocacy/research firm. This wiki covers case law, statutes, agent roles, workflows, infrastructure, firm governance, and all operational knowledge required for autonomous legal advocacy.

## Conventions
- File names: lowercase, hyphens, no spaces (e.g., `fourth-amendment.md`, `lex-lead-counsel.md`)
- Every wiki page starts with YAML frontmatter (see below)
- Use `[[wikilinks]]` to link between pages (minimum 2 outbound links per page)
- When updating a page, always bump the `updated` date
- Every new page must be added to `index.md` under the correct section
- Every action must be appended to `log.md`
- **Provenance markers:** On pages that synthesize 3+ sources, append `^[raw/articles/source-file.md]`
  at the end of paragraphs whose claims come from a specific source.
- **Agent outputs as sources:** When an agent (Lex, Mira, etc.) produces a memo or analysis that is filed in `raw/transcripts/`, treat it as a source like any other. Cite the agent and timestamp.

## Frontmatter
```yaml
---
title: Page Title
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: entity | concept | comparison | query | summary
tags: [from taxonomy below]
sources: [raw/articles/source-name.md]
# Optional quality signals:
confidence: high | medium | low
contested: true
contradictions: [other-page-slug]
---
```

### raw/ Frontmatter
```yaml
---
source_url: https://example.com/article
ingested: YYYY-MM-DD
sha256: <hex digest of the raw content below the frontmatter>
agent_author: <agent name if agent-generated>
---
```

## Tag Taxonomy

### Legal
- statute, case-law, precedent, jurisdiction, filing, motion, brief, discovery, evidence, constitutional-rights, civil-rights, criminal-defense

### Cases
- case, intake, investigation, litigation, advocacy, settlement, appeal, class-action, habeas-corpus

### Agents & Roles
- agent, role, workflow, orchestration, lead-counsel, researcher, investigator, analyst, advocate, paralegal, writer, auditor

### Technology
- deployment, infrastructure, api, integration, automation, mcp-tool, dokploy, compose, github-action, x402

### Organization
- policy, governance, compliance, ethics, zhc-principle, board-decision, firm-structure

### Meta
- comparison, timeline, controversy, prediction, decision, strategy, risk-assessment

## Page Thresholds
- **Create a page** when an entity/concept appears in 2+ sources OR is central to one source
- **Add to existing page** when a source mentions something already covered
- **DON'T create a page** for passing mentions, minor details, or things outside the domain
- **Split a page** when it exceeds ~200 lines — break into sub-topics with cross-links
- **Archive a page** when its content is fully superseded — move to `_archive/`, remove from index

## Entity Pages
One page per notable entity (agent, person, org, case, statute, tool). Include:
- Overview / what it is
- Key facts and dates
- Relationships to other entities ([[wikilinks]])
- Source references

## Concept Pages
One page per concept or topic. Include:
- Definition / explanation
- Current state of knowledge
- Open questions or debates
- Related concepts ([[wikilinks]])

## Comparison Pages
Side-by-side analyses. Include:
- What is being compared and why
- Dimensions of comparison (table format preferred)
- Verdict or synthesis
- Sources

## Update Policy
When new information conflicts with existing content:
1. Check the dates — newer sources generally supersede older ones
2. If genuinely contradictory, note both positions with dates and sources
3. Mark the contradiction in frontmatter: `contradictions: [page-name]`
4. Flag for user review in the lint report
