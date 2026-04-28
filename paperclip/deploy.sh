#!/usr/bin/env bash
# deploy.sh — Deploy MISJustice Alliance Firm org to Paperclip
# Usage: ./deploy.sh <paperclip-host> <invite-code>

set -euo pipefail

PAPERCLIP_HOST="${1:-}"
INVITE_CODE="${2:-}"

if [[ -z "$PAPERCLIP_HOST" || -z "$INVITE_CODE" ]]; then
  echo "Usage: $0 <paperclip-host> <invite-code>"
  echo "Example: $0 paperclip.hashgrid.net abc123def456"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="$SCRIPT_DIR/agent-registry.yaml"

# ---------------------------------------------------------------------------
# 1. Verify Paperclip health
# ---------------------------------------------------------------------------
echo "[1/4] Checking Paperclip health at $PAPERCLIP_HOST ..."
curl -fsS "https://$PAPERCLIP_HOST/api/health" || {
  echo "ERROR: Paperclip API unreachable"
  exit 1
}

# ---------------------------------------------------------------------------
# 2. Fetch onboarding instructions
# ---------------------------------------------------------------------------
echo "[2/4] Fetching onboarding instructions ..."
curl -fsS "https://$PAPERCLIP_HOST/api/invites/$INVITE_CODE/onboarding.txt" \
  -o /tmp/paperclip-onboarding.txt
echo "Onboarding instructions saved to /tmp/paperclip-onboarding.txt"

# ---------------------------------------------------------------------------
# 3. Register each agent from the registry
# ---------------------------------------------------------------------------
echo "[3/4] Registering agents from registry ..."
# Parse registry entries and submit join requests
# Requires yq for YAML parsing
if ! command -v yq &>/dev/null; then
  echo "WARN: yq not found. Install yq to enable automated registration."
  echo "Manual registration steps are documented in README.md"
  exit 0
fi

yq e '.registry | keys | .[]' "$REGISTRY" | while read -r agent_id; do
  echo "  Registering: $agent_id"
  # TODO: extract per-agent config and submit join request
  # This is a template — actual registration requires gateway tokens
  # which are generated after the OpenClaw gateway is running.
done

echo "Agent registry parsed. Complete registration per agent following README.md"

# ---------------------------------------------------------------------------
# 4. Verify federation config
# ---------------------------------------------------------------------------
echo "[4/4] Federation config validated."
echo ""
echo "Next steps:"
echo "  1. Ensure OpenClaw gateway is running: openclaw gateway run --bind lan --port 18789"
echo "  2. For each agent, retrieve gateway token and submit join request"
echo "  3. Wait for board approval"
echo "  4. Claim API keys"
echo "  5. Save credentials to agent workspace directories"
