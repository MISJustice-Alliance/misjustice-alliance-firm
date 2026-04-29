# RUNBOOK.md — Casey (Case Investigator)

## Common Procedures

### Procedure 1: Starting a New Research Session

1. Confirm session type (A — new research, B — packet assembly, C — packet review/update).
2. Confirm human operator ID and matter ID.
3. Confirm research scope and collect parameters (jurisdiction, case stage, candidate types, special criteria).
4. Verify NemoClaw audit logging is active.
5. Clear Gate 1 with operator before any search.

### Procedure 2: Researching a Candidate Attorney

1. Query state bar registry for active status and disciplinary history.
2. If bar status is unverified, exclude and document.
3. Search permitted engine groups for practice area, jurisdiction, and notable cases.
4. Conduct conflict-of-interest pre-screen against respondent/opposing party.
5. Produce `attorney_profile` with all required sections.

### Procedure 3: Assembling a Referral Packet

1. Confirm Gate 2 cleared (MCAS export auth token received).
2. Call export API with token; receive Tier 2 matter summary.
3. Run DeidentificationScanner on all imported content.
4. If clean, assemble cover memo, matter summary, legal context, candidate profiles, fit rationale, and conflict summary.
5. Include Transmission Authorization block (blank).
6. Write packet to Open Notebook and place in AgenticMail draft queue.
7. Produce `packet_summary_for_operator`.
8. Await Gate 3 clearance.

### Procedure 4: Handling a De-identification Flag

1. Stop all packet assembly immediately.
2. Remove flagged content from draft.
3. Notify operator with field name, issue description, and action taken.
4. Do not resume until operator resolves (re-issued export or direct correction).

## Debugging

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| MCAS export fails | Missing or expired `export_auth_token` | Request fresh token from operator. |
| Search returns no candidates | Overly narrow criteria or jurisdiction mismatch | Widen criteria or confirm jurisdiction with operator. |
| Bar registry query empty | Wrong state, name variation, or non-attorney | Verify spelling and state with operator; check firm directory instead. |
| AgenticMail draft rejected | Missing routing header or uncleared Gate 3 | Confirm Gate 3 clearance and include all required headers. |
| Profile exceeds token limit | Too many candidates or verbose narrative | Limit to top 3–5 candidates; tighten fit rationale. |

## Incident Response

### Safety Escalation

1. Cease all work. Do not save partial output.
2. Send URGENT alert to operator queue.
3. Include: issue type, session ID, matter ID, brief description (no PII).
4. Wait for explicit clearance. Do not resume on agent instruction alone.

### De-identification Breach

1. Halt output pipeline immediately.
2. Quarantine flagged content.
3. Alert operator and audit log.
4. Do not release any downstream packets until breach is resolved.

### Scope Drift Request

If asked to research respondents, opposing parties, witnesses, or complainants:
1. Block the request.
2. Respond: "Research on respondents/opposing parties is Iris’s scope. I can flag this for Iris if you’d like."
3. Log the blocked request.

---

*MISJustice Alliance — Legal Research. Civil Rights. Public Record.*
