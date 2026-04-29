#!/usr/bin/env bash
# deploy.sh — Deploy MISJustice Alliance Firm org to Paperclip
# Usage: ./deploy.sh <paperclip-host> <invite-code>

set -euo pipefail

PAPERCLIP_HOST="${1:-}"
INVITE_CODE="${2:-}"
GATEWAY_TOKEN="${GATEWAY_TOKEN:-}"

if [[ -z "$PAPERCLIP_HOST" || -z "$INVITE_CODE" ]]; then
  echo "Usage: $0 <paperclip-host> <invite-code>"
  echo "Example: $0 paperclip.hashgrid.net abc123def456"
  echo ""
  echo "Environment variables:"
  echo "  GATEWAY_TOKEN  — If set, auto-register agents after parsing"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="$SCRIPT_DIR/agent-registry.yaml"
PAYLOADS_FILE="/tmp/paperclip-registration-payloads.json"

# ---------------------------------------------------------------------------
# 1. Verify Paperclip health
# ---------------------------------------------------------------------------
echo "[1/5] Checking Paperclip health at $PAPERCLIP_HOST ..."
curl -fsS "https://$PAPERCLIP_HOST/api/health" >/dev/null 2>&1 || {
  echo "ERROR: Paperclip API unreachable at https://$PAPERCLIP_HOST/api/health"
  exit 1
}
echo "  ✓ Paperclip is healthy"

# ---------------------------------------------------------------------------
# 2. Fetch onboarding instructions
# ---------------------------------------------------------------------------
echo "[2/5] Fetching onboarding instructions ..."
curl -fsS "https://$PAPERCLIP_HOST/api/invites/$INVITE_CODE/onboarding.txt" \
  -o /tmp/paperclip-onboarding.txt 2>/dev/null || {
  echo "WARN: Could not fetch onboarding.txt (non-fatal)"
}
echo "  ✓ Onboarding instructions saved to /tmp/paperclip-onboarding.txt"

# ---------------------------------------------------------------------------
# 3. Parse registry and build registration payloads
# ---------------------------------------------------------------------------
echo "[3/5] Parsing agent registry and building payloads ..."

_agent_ids=()
_payloads=()

_parse_registry() {
  local registry_file="$1"

  if command -v yq &>/dev/null; then
    yq e '.registry | keys | .[]' "$registry_file" 2>/dev/null
  elif python3 -c "import yaml" 2>/dev/null; then
    python3 -c "
import yaml, sys
try:
    data = yaml.safe_load(open('$registry_file'))
    for k in data.get('registry', {}):
        print(k)
except Exception as e:
    sys.exit(1)
"
  else
    echo "ERROR: Neither yq nor python3 with PyYAML is available. Cannot parse registry." >&2
    exit 1
  fi
}

_build_payload() {
  local agent_id="$1"
  local registry_file="$2"

  if command -v yq &>/dev/null; then
    yq e -oj ".registry.$agent_id" "$registry_file" 2>/dev/null || echo '{}'
  else
    python3 -c "
import yaml, json, sys
try:
    data = yaml.safe_load(open('$registry_file'))
    agent = data.get('registry', {}).get('$agent_id', {})
    print(json.dumps(agent))
except Exception:
    print('{}')
"
  fi
}

while IFS= read -r agent_id; do
  [[ -z "$agent_id" ]] && continue
  _agent_ids+=("$agent_id")
  payload="$(_build_payload "$agent_id" "$REGISTRY")"
  _payloads+=("$payload")
  echo "  Prepared: $agent_id"
done < <(_parse_registry "$REGISTRY")

if [[ ${#_agent_ids[@]} -eq 0 ]]; then
  echo "ERROR: No agents found in registry."
  exit 1
fi

# Write all payloads to JSON file
echo "[" > "$PAYLOADS_FILE"
for i in "${!_payloads[@]}"; do
  printf '{"agent_id":"%s","config":%s}' "${_agent_ids[$i]}" "${_payloads[$i]}" >> "$PAYLOADS_FILE"
  if [[ $i -lt $((${#_payloads[@]} - 1)) ]]; then
    echo "," >> "$PAYLOADS_FILE"
  else
    echo "" >> "$PAYLOADS_FILE"
  fi
done
echo "]" >> "$PAYLOADS_FILE"

echo "  ✓ ${#_agent_ids[@]} agents prepared for registration"
echo "  ✓ Payloads saved to $PAYLOADS_FILE"

# ---------------------------------------------------------------------------
# 4. Register agents (auto if GATEWAY_TOKEN is set, otherwise print commands)
# ---------------------------------------------------------------------------
echo "[4/5] Registering agents ..."

if [[ -z "$GATEWAY_TOKEN" ]]; then
  echo ""
  echo "  GATEWAY_TOKEN not set. Manual registration required."
  echo "  For each agent, run:"
  echo ""
  for agent_id in "${_agent_ids[@]}"; do
    echo "    curl -X POST https://$PAPERCLIP_HOST/api/agents/register \\"
    echo "      -H 'Authorization: Bearer <GATEWAY_TOKEN>' \\"
    echo "      -H 'Content-Type: application/json' \\"
    echo "      -d '{\"agent_id\":\"$agent_id\",\"invite_code\":\"$INVITE_CODE\"}'"
    echo ""
  done
  echo "  Set GATEWAY_TOKEN to auto-register on next run."
else
  echo "  GATEWAY_TOKEN is set. Auto-registering ${#_agent_ids[@]} agents ..."
  success_count=0
  fail_count=0
  for agent_id in "${_agent_ids[@]}"; do
    echo -n "  Registering $agent_id ... "
    if curl -fsS -X POST "https://$PAPERCLIP_HOST/api/agents/register" \
      -H "Authorization: Bearer $GATEWAY_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"agent_id\":\"$agent_id\",\"invite_code\":\"$INVITE_CODE\"}" \
      >/dev/null 2>&1; then
      echo "✓"
      ((success_count++)) || true
    else
      echo "✗ (will retry manually)"
      ((fail_count++)) || true
    fi
  done
  echo ""
  echo "  Results: $success_count succeeded, $fail_count failed"
fi

# ---------------------------------------------------------------------------
# 5. Verify federation config
# ---------------------------------------------------------------------------
echo "[5/5] Validating federation config ..."
if [[ -f "$SCRIPT_DIR/federation-config.yaml" ]]; then
  echo "  ✓ federation-config.yaml found"
else
  echo "  ✗ federation-config.yaml missing"
fi

if [[ -f "$PAYLOADS_FILE" ]]; then
  agent_count=$(python3 -c "import json; print(len(json.load(open('$PAYLOADS_FILE'))))" 2>/dev/null || echo "?")
  echo "  ✓ $agent_count registration payloads ready"
else
  echo "  ✗ Registration payloads not found"
fi

echo ""
echo "====================================================================="
echo "Deployment summary:"
echo "  Paperclip host:     https://$PAPERCLIP_HOST"
echo "  Agents prepared:    ${#_agent_ids[@]}"
echo "  Payloads file:      $PAYLOADS_FILE"
echo ""
echo "Next steps:"
if [[ -z "$GATEWAY_TOKEN" ]]; then
  echo "  1. Start OpenClaw gateway: openclaw gateway run --bind lan --port 18789"
  echo "  2. Retrieve gateway token from Paperclip dashboard"
  echo "  3. Re-run with GATEWAY_TOKEN=<token> $0 $PAPERCLIP_HOST $INVITE_CODE"
  echo "  4. Or execute the printed curl commands manually"
else
  echo "  1. Verify agent statuses in Paperclip dashboard"
  echo "  2. Run health checks: curl https://$PAPERCLIP_HOST/api/agents/health"
  echo "  3. Wait for board approval"
  echo "  4. Claim API keys per agent"
  echo "  5. Save credentials to agent workspace directories"
fi
echo "====================================================================="
