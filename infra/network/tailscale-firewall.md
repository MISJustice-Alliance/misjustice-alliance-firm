# Tailscale and firewall binding

This stack is intended to be reachable only over Tailscale.

## Required runtime values

1. Set `TAILSCALE_IP` to the host's Tailscale IPv4 address.
2. Bind all user-facing services to `"${TAILSCALE_IP}:PORT:PORT"`.
3. Deny public ingress to the same ports on the machine firewall.

## Recommended bindings

- MCPJungle UI + MCP endpoint: `TAILSCALE_IP:8080`
- Grafana: `TAILSCALE_IP:3000`
- Prometheus: `127.0.0.1:9090` or `TAILSCALE_IP:9090` for operator access
- Honcho API: `127.0.0.1:8000` or Tailscale-only if exposing to other hosts

## UFW example

```bash
sudo ufw default deny incoming
sudo ufw allow in on tailscale0 to any port 8080 proto tcp
sudo ufw allow in on tailscale0 to any port 3000 proto tcp
sudo ufw allow in on tailscale0 to any port 9090 proto tcp
sudo ufw deny in to any port 8080 proto tcp
sudo ufw deny in to any port 3000 proto tcp
sudo ufw deny in to any port 9090 proto tcp
```

## nftables example

```nft
add rule inet filter input iifname "tailscale0" tcp dport { 8080, 3000, 9090 } accept
add rule inet filter input tcp dport { 8080, 3000, 9090 } drop
```

## Tailscale ACL intent

- `hermes-supervisor`: full access to MCPJungle management and all Tool Groups.
- `openclaw-worker`: only group-scoped MCP endpoints for `legal-corpus`, `research`, and `technical`.
- `human-operator`: dashboard read-only access via Grafana and MCPJungle UI.

## Operational note

MCPJungle `/metrics` is not bearer-protected. Keep it behind the same Tailscale boundary and avoid public exposure.
