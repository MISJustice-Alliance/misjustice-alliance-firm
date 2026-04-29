# Paperclip Org Structure

This directory contains the Paperclip-deployable organization configuration for the MISJustice Alliance Firm.

## Files

| File | Purpose |
|---|---|
| `federation-config.yaml` | Organization definition, board structure, default policies |
| `agent-registry.yaml` | All 16 agents with their Paperclip registration profiles |
| `deploy.sh` | Deployment script template (requires `yq` for full automation) |

## Architecture

```
Paperclip Control Plane
    |
    +-- Federation: misjustice-alliance-firm
        |
        +-- Board
        |   +-- Managing Partner (approves all)
        |   +-- Technical Director (approves systems agents)
        |   +-- Ethics Officer (approves intake/advocacy agents)
        |
        +-- Crews (CrewAI lightweight teams)
        |   +-- Intake: Avery, Sol
        |   +-- Research: Mira, Casey, Lex
        |   +-- Drafting: Quill, Citation, Chronology
        |   +-- Advocacy: Rae, Social Media Manager
        |   +-- Support: Ollie, Atlas
        |   +-- Systems: Sol, Hermes, Webmaster
        |
        +-- OpenClaw Gateway (ws://host:18789)
            +-- Heavy-weight agents with full skill arrays
```

## Deployment Procedure

### Prerequisites

- Paperclip instance running in `authenticated` mode
- Valid invite code from the Paperclip board admin
- OpenClaw gateway running and accessible

### Step 1: Configure environment

```bash
export PAPERCLIP_API_URL="https://paperclip.hashgrid.net"
export GATEWAY_URL="ws://$(curl -s https://ip.sb):18789"
```

### Step 2: Run deployment script

```bash
./deploy.sh paperclip.hashgrid.net <invite-code>
```

### Step 3: Register each agent

For each agent in `agent-registry.yaml`:

1. Retrieve the agent's OpenClaw token:
   ```bash
   openclaw tokens create --agent <agent_id> --scopes operator.admin
   ```

2. Submit join request:
   ```bash
   curl -fsS -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "requestType": "agent",
       "agentName": "<agent_id>",
       "adapterType": "openclaw_gateway",
       "agentDefaultsPayload": {
         "url": "'"$GATEWAY_URL"'",
         "headers": {"x-openclaw-token": "<token>"}
       }
     }' \
     "$PAPERCLIP_API_URL/api/invites/<invite-code>/join"
   ```

3. Wait for board approval, then claim API key.

4. Save credentials to agent workspace:
   ```bash
   mkdir -p agents/<agent_id>/workspace
   # Save paperclip-agent-config.json and claimed-api-key.json
   ```

## CrewAI vs OpenClaw

| Aspect | CrewAI (Lightweight) | OpenClaw (Heavy-weight) |
|---|---|---|
| Use case | Fast workflows, deterministic tasks | Complex reasoning, long-running actions |
| Agents | Intake, research, drafting crews | Sol, Hermes, multi-step pipelines |
| Skills | Simple document/web/database tools | Arweave, Turbo, full skill arrays |
| State | Ephemeral per-crew execution | Persistent across sessions |
| Deployment | `crewai-orchestrator/` | `openclaw-ansible/` |

## References

- `paperclip-agent-registration` skill for detailed registration steps
- `paperclip-openclaw-onboarding` skill for gateway setup and troubleshooting
- `docs/crewai-mcp-integration.md` for CrewAI MCP tool configuration
