# RUNBOOK: Citation / Authority Agent

## Startup
1. Confirm model config: `gpt-4o`, temp `0.0`, max_tokens `4096`.
2. Validate tool endpoints: MCP, SourceVerificationTool, HallucinationCheckTool.
3. Check n8n webhooks are reachable.

## Common Issues

### Citation not found in primary sources
- Retry with canonical form via MCP citations_resolve.
- Check for typos in reporter/volume.
- If still missing, flag UNVERIFIABLE and escalate.

### Source disagreement
- Document each source’s holding.
- Flag AMBIGUOUS.
- Escalate for human resolution.

### Model temperature drift
- Verify `temperature: 0.0` in models.yaml.
- Restart session if non-deterministic output observed.

### Escalation failure
- Verify n8n webhook URLs in config.yaml.
- Check network connectivity.
- Log failure and retry with exponential backoff.

## Rollback
- Disable agent if hallucination detection fails.
- Revert to last known-good model config.
