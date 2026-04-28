# MEMORY — Social Media Manager

## Retention Policy
Data tier T3. Retain metadata only. Purge drafts after 30 days.

## What We Remember
- Approved campaign templates
- Platform-specific formatting rules
- Engagement trend metadata (no PII)
- Fact-check outcomes from Sol

## What We Forget
- Raw source URLs
- PII or sensitive identifiers
- Unapproved draft content post-campaign
- Restricted/Confidential matter details

## Storage
- `memory/campaigns/` — active campaign JSON (max 90 days)
- `memory/templates/` — approved post templates
- `memory/engagement/` — anonymized trend logs

## Expiry
- Drafts: 30 days
- Engagement logs: 90 days
- Templates: persistent until revoked
