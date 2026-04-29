# RUNBOOK.md — Quill

## Common Procedures

### Starting a Drafting Session
1. Confirm session type: MEMO_DRAFT, MOTION_DRAFT, BRIEF_DRAFT, or GITBOOK_CURATION.
2. Log operator ID and verify NemoClaw audit logging is active.
3. Confirm matter ID and load verified inputs via MatterReadTool and DocumentReadTool.
4. Verify no Tier-0/1 data is present in accessible fields.

### Processing a Memo Draft Request
1. Load matter context and source documents.
2. Verify all citations are from verified inputs.
3. Compose memo using MemoDraftingTool.
4. Run redaction verification scan.
5. Produce draft in Open Notebook and mark PENDING HUMAN REVIEW.

### Processing a Motion Draft Request
1. Load matter context, court rules, and procedural requirements.
2. Verify facts and citations.
3. Compose motion using MotionDraftingTool.
4. Run redaction verification scan.
5. Produce draft in Open Notebook and mark PENDING HUMAN REVIEW.

### Processing a Brief Draft Request
1. Load matter context, record citations, and standard of review.
2. Verify all citations and holdings.
3. Compose brief using BriefDraftingTool.
4. Generate Table of Contents and Table of Authorities.
5. Run redaction verification scan.
6. Produce draft in Open Notebook and mark PENDING HUMAN REVIEW.

### Processing a GitBook Curation Request
1. Confirm page type, matter ID, and approval status.
2. Load T3 public-approved exports only.
3. Scan for Tier-0/1 identifiers.
4. Organize content and add cross-links.
5. Produce curated page draft and mark PENDING HUMAN REVIEW.

## Debugging

### Unverified Citations in Inputs
- **Symptom**: Drafting paused due to unverified source citations.
- **Action**: Flag to operator. Recommend Citation Authority review. Do not proceed until resolved.

### Missing Source Inputs
- **Symptom**: Required input document or research memo not found.
- **Action**: Flag to operator. Await instruction. Do not fabricate content.

### Tier-0/1 Data in Source Documents
- **Symptom**: Redaction scan flags sensitive identifiers.
- **Action**: Stop drafting. Flag to operator. Request redacted inputs.

### MCAS API Unavailable
- **Symptom**: Matter context cannot be loaded.
- **Action**: Log `quill_mcas_unavailable` metric. Notify operator. Preserve session state for retry.

## Incident Response

### Autonomous Publication Attempted
1. Block the attempt via NemoClaw rail.
2. Log `quill_autonomous_publication_blocked` event.
3. Notify operator of blocked action.

### Fabricated Citation Detected
1. Block draft output.
2. Flag for human review.
3. Log `quill_fabricated_citation_flagged` event.
4. Require operator to verify all citations before retry.

### Session Interrupted Without Gate Clearance
1. All drafts remain in `draft` status.
2. Log `session_interrupted` audit event.
3. On resume, present current state and prompt operator to continue, discard, or archive.
