# 02 — Ansible Deployment Framework

This section defines the infrastructure-as-code deployment strategy for the Misjustice Alliance Firm. The framework extends `openclaw-ansible` with four new role families and formalizes environment progression from development through production.

---

## 1. Extended Role Architecture

The deployment extends the baseline `openclaw-ansible` roles (`tailscale`, `user`, `docker`, `firewall`, `nodejs`, `openclaw`) with a `misjustice-*` role hierarchy.

| Role Family | Role Name | Purpose | Depends On |
|-------------|-----------|---------|------------|
| **Baseline** | `tailscale` | WireGuard mesh VPN, exit nodes, ACL tags | — |
| | `user` | Service accounts, SSH hardening, sudoers | — |
| | `docker` | Docker CE, Buildx, compose plugin, daemon hardening | `user` |
| | `firewall` | UFW + `DOCKER-USER` iptables chain, default-deny | — |
| | `nodejs` | Node.js LTS, corepack, pnpm setup | — |
| | `openclaw` | Base OpenClaw container on `127.0.0.1` | `docker`, `firewall` |
| **Core** | `misjustice-core` | MCAS runtime, PostgreSQL, Redis, persistent volumes | `docker`, `firewall` |
| **Agents** | `misjustice-agents` | CrewAI orchestrator containers, agent worker pools | `misjustice-core` |
| **Platform** | `misjustice-platform` | Paperclip (UI/API), Hermes (message bus), reverse proxy | `misjustice-core`, `tailscale` |
| **Security** | `misjustice-security` | Secret generation, encryption key rotation, HashiCorp Vault Agent (optional) | `misjustice-core` |

### Role Directory Convention

```
roles/
  <role-name>/
    tasks/
      main.yml          # entry point
      preflight.yml     # idempotency checks, assertions
      install.yml       # package/container operations
      configure.yml     # templated configs
      verify.yml        # post-apply health probes
    handlers/
      main.yml          # service restarts, firewall reloads
    templates/
      *.j2              # config files, systemd units, env files
    defaults/
      main.yml          # safe defaults (override in group_vars)
    vars/
      main.yml          # internal constants (version pins, paths)
    files/
      static assets     # CA certs, hardening scripts
    meta/
      main.yml          # role dependencies
```

> **Rule**: Every role under `misjustice-*` must implement `preflight.yml` and `verify.yml` to guarantee idempotency and observable outcomes.

---

## 2. New Ansible Roles

### 2.1 `misjustice-core`

| Sub-component | Responsibility | Binding / Exposure |
|---------------|----------------|--------------------|
| `mcas` | MCAS (Multi-Channel Application Server) primary runtime | `127.0.0.1:3000` |
| `postgres` | Relational state, CrewAI memory, audit logs | `127.0.0.1:5432` |
| `redis` | Task queues, agent pub/sub, session cache | `127.0.0.1:6379` |
| `volumes` | Named Docker volumes for data durability | — |

**Pseudocode Structure**:
```yaml
# tasks/main.yml
- import_tasks: preflight.yml   # assert Docker API reachable, disk > threshold
- import_tasks: volumes.yml     # ensure named volumes exist (idempotent)
- import_tasks: network.yml     # create 'misjustice' bridge network
- import_tasks: postgres.yml    # templated compose service, env from vault
- import_tasks: redis.yml       # templated compose service, persistence on
- import_tasks: mcas.yml        # depends on postgres+redis healthy
- import_tasks: verify.yml      # wait_for port, pg_isready, redis-cli ping
```

**Key Defaults**:
- PostgreSQL: 16-alpine, `POSTGRES_USER=misjustice`, `POSTGRES_DB=firm`
- Redis: 7-alpine, `appendonly=yes`, maxmemory policy `allkeys-lru`
- All containers bound to `127.0.0.1`; no published host ports exposed externally.

---

### 2.2 `misjustice-agents`

| Sub-component | Responsibility |
|---------------|----------------|
| `orchestrator` | CrewAI flow scheduler, task graph execution |
| `worker-pool` | Horizontal agent workers (CPU-bound tasks) |
| `executor` | Sandboxed execution gateway (NemoClaw OpenShell) |

**Pseudocode Structure**:
```yaml
# tasks/main.yml
- import_tasks: preflight.yml        # assert misjustice-core healthy
- import_tasks: executor.yml         # NemoClaw sandbox, blueprint YAML policies
- import_tasks: worker-pool.yml      # scaled via 'agent_replicas' variable
- import_tasks: orchestrator.yml     # depends on executor + redis
- import_tasks: verify.yml           # HTTP health endpoint, queue depth check
```

**Key Defaults**:
- `agent_replicas: 2` (dev), `4` (staging), `8` (prod)
- Blueprint policies mounted read-only into executor container
- Workers auto-register with orchestrator via Redis discovery

---

### 2.3 `misjustice-platform`

| Sub-component | Responsibility | Binding / Exposure |
|---------------|----------------|--------------------|
| `paperclip` | Firm UI and public API (target: `100.106.20.102:3100`) | `127.0.0.1:3100` inside host; Tailscale serves |
| `hermes` | Internal message bus, webhook ingress, event routing | `127.0.0.1:4100` |
| `reverse-proxy` | Caddy or Traefik (Dockerized), routes to Paperclip/Hermes | `127.0.0.1:80/443` |

**Pseudocode Structure**:
```yaml
# tasks/main.yml
- import_tasks: preflight.yml      # assert Tailscale IP assigned if prod
- import_tasks: hermes.yml         # message bus container
- import_tasks: paperclip.yml      # UI container, env vars for API_BASE
- import_tasks: reverse-proxy.yml  # Caddyfile/Traefik dynamic config from template
- import_tasks: tailscale-serve.yml # register 127.0.0.1:3100 as tailscale serve
- import_tasks: verify.yml         # curl 200 on Tailscale IP:3100/healthz
```

**Key Defaults**:
- Paperclip binds `127.0.0.1:3100`; Tailscale `serve` exposes it on the mesh.
- Caddy automatic HTTPS disabled (Tailscale handles TLS via mesh).
- Hermes webhook receiver validates HMAC signatures using key from `misjustice-security`.

---

### 2.4 `misjustice-security`

| Sub-component | Responsibility |
|---------------|----------------|
| `secrets` | Generate or retrieve DB passwords, API keys, signing secrets |
| `encryption-keys` | Age or OpenPGP key pairs for data-at-rest and backup encryption |
| `vault-agent` *(optional)* | HashiCorp Vault Agent sidecar for dynamic secrets (future) |
| `rotation` | Key rotation orchestration: generate new, re-encrypt, revoke old |

**Pseudocode Structure**:
```yaml
# tasks/main.yml
- import_tasks: preflight.yml      # assert entropy available, age installed
- import_tasks: secrets.yml        # write env files with 0600, root-owned
- import_tasks: encryption-keys.yml # age-keygen if keys absent
- import_tasks: rotation.yml       # triggered by 'security_rotate=true' flag
- import_tasks: verify.yml         # checksum validation, key readability
```

**Key Defaults**:
- Secrets written to `/opt/misjustice/secrets/.env.<service>`
- Encryption keys stored at `/opt/misjustice/keys/` with `0400` permissions
- Rotation is manual-gated; never auto-executes on standard playbook runs.

---

## 3. Inventory Structure

```
inventories/
  dev/
    hosts.yml
    group_vars/
      all.yml
      docker.yml
      tailscale.yml
    host_vars/
      dev-node-01.yml
  staging/
    hosts.yml
    group_vars/
      all.yml
      docker.yml
      tailscale.yml
    host_vars/
      stg-node-01.yml
  prod/
    hosts.yml
    group_vars/
      all.yml
      docker.yml
      tailscale.yml
    host_vars/
      prod-node-01.yml
```

### Environment Topology

| Environment | Host Count | Tailscale ACL Tag | Purpose |
|-------------|-----------|-------------------|---------|
| `dev` | 1 | `tag:openclaw-dev` | Local feature validation, destructive testing |
| `staging` | 1 | `tag:openclaw-staging` | Pre-release integration, load simulation |
| `prod` | 1 (current) | `tag:openclaw-prod` | Live firm operations at `100.106.20.102` |

### Sample `inventories/prod/hosts.yml`

```yaml
all:
  children:
    firm_hosts:
      hosts:
        prod-node-01:
          ansible_host: 100.106.20.102
          ansible_user: deploy
          tailscale_ip: 100.106.20.102
          firm_role: primary
      vars:
        env: prod
        deploy_branch: main
```

> **Rule**: All access is over Tailscale SSH (`100.x.x.x`). Direct public IP SSH is blocked by `firewall` role.

---

## 4. Variable Definitions (`group_vars`)

### 4.1 `inventories/*/group_vars/all.yml`

```yaml
---
# Firm identity
firm_name: misjustice-alliance
firm_domain: "{{ 'dev.' if env == 'dev' else 'staging.' if env == 'staging' else '' }}firm.internal"

# Deployment control
deploy_branch: main
deploy_force_pull: false

# Version pins (immutable tags only)
mcas_version: "1.2.3"
paperclip_version: "2.0.1"
hermes_version: "0.9.4"
nemoclaw_version: "0.5.0"

# Resource limits (Docker)
postgres_memory: "512m"
redis_memory: "256m"
mcas_memory: "1g"
agent_worker_memory: "2g"

# Replicas
agent_replicas: "{{ 2 if env == 'dev' else 4 if env == 'staging' else 8 }}"

# Paths
install_base: /opt/misjustice
data_path: "{{ install_base }}/data"
secrets_path: "{{ install_base }}/secrets"
keys_path: "{{ install_base }}/keys"
logs_path: "{{ install_base }}/logs"

# Feature flags
enable_nemoclaw_sandbox: true
enable_vault_agent: false
enable_backup_encryption: true
```

### 4.2 `inventories/*/group_vars/docker.yml`

```yaml
---
docker_daemon_options:
  log-driver: json-file
  log-opts:
    max-size: "10m"
    max-file: "3"
  live-restore: true
  userland-proxy: false
  iptables: true
  bridge: none  # disable default bridge; use custom 'misjustice' network

docker_compose_version: "v2.27.0"
```

### 4.3 `inventories/*/group_vars/tailscale.yml`

```yaml
---
tailscale_auth_key: "{{ lookup('env', 'TS_AUTH_KEY') }}"  # injected via CI/CD
tailscale_tags:
  - "tag:openclaw-{{ env }}"

tailscale_extra_args:
  - "--ssh"
  - "--accept-dns=true"
  - "--advertise-exit-node=false"

tailscale_serve_routes:
  - src: "100.106.20.102:3100"
    dst: "127.0.0.1:3100"
    proto: tcp
```

### 4.4 Secret Variables (`host_vars` or vaulted `group_vars`)

Secrets are **never** committed plaintext. Use `ansible-vault` or environment injection at runtime.

```yaml
---
# ansible-vault encrypted
postgres_password: "{{ vault_postgres_password }}"
redis_password: "{{ vault_redis_password }}"
hermes_signing_secret: "{{ vault_hermes_secret }}"
paperclip_api_key: "{{ vault_paperclip_key }}"
age_private_key: "{{ vault_age_private_key }}"
```

---

## 5. Playbook Execution Order

### 5.1 Main Playbook: `deploy-firm.yml`

```yaml
# Pseudocode — execution order
- name: Baseline Infrastructure
  hosts: firm_hosts
  become: yes
  roles:
    - role: tailscale
      tags: [network, baseline]
    - role: user
      tags: [baseline]
    - role: docker
      tags: [baseline, docker]
    - role: firewall
      tags: [baseline, security]
    - role: nodejs
      tags: [baseline]
    - role: openclaw
      tags: [baseline, openclaw]

- name: Misjustice Core Services
  hosts: firm_hosts
  become: yes
  roles:
    - role: misjustice-security
      tags: [security, secrets]
    - role: misjustice-core
      tags: [core, data]

- name: Misjustice Agent Layer
  hosts: firm_hosts
  become: yes
  roles:
    - role: misjustice-agents
      tags: [agents, ai]

- name: Misjustice Platform Layer
  hosts: firm_hosts
  become: yes
  roles:
    - role: misjustice-platform
      tags: [platform, web]
```

### 5.2 Idempotency Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| **Container images** | Pin immutable digests or semver tags; `docker_image` with `source: pull` and `force_source: "{{ deploy_force_pull }}"` |
| **Config files** | Template modules with `validate` parameter (e.g., `caddy adapt --config %s`) |
| **Named volumes** | `docker_volume` with `state: present`; data never destroyed on re-run |
| **Secrets** | `stat` check before generation; skip if file exists and `security_rotate=false` |
| **Firewall rules** | UFW `rule` with `delete: false` enforcement; `DOCKER-USER` chain managed via `iptables` idempotent insert |
| **Service state** | Handlers triggered only on config change; `systemd` units use `Restart=unless-stopped` |
| **Tailscale** | Check `tailscale status` before re-authentication; idempotent `tailscale up` args |

### 5.3 Tag-Based Targeted Runs

```bash
# Full deployment
ansible-playbook -i inventories/prod deploy-firm.yml

# Rotate secrets only
ansible-playbook -i inventories/prod deploy-firm.yml --tags security -e security_rotate=true

# Update only platform containers
ansible-playbook -i inventories/prod deploy-firm.yml --tags platform -e deploy_force_pull=true

# Re-apply firewall rules after ACL change
ansible-playbook -i inventories/prod deploy-firm.yml --tags firewall
```

---

## 6. Rollback Strategy & Health Verification

### 6.1 Rollback Architecture

Every deployment creates a **version snapshot** before mutation:

| Artifact | Snapshot Method | Retention |
|----------|----------------|-----------|
| Docker images | Tagged with `{{ deploy_timestamp }}` prior to pull | Last 5 per service |
| Compose configs | Copied to `{{ install_base }}/backups/compose-{{ timestamp }}.yml` | Last 10 |
| Database | Pre-deploy `pg_dump` to encrypted object storage | Last 3 |
| Environment | `.env` files copied to `{{ secrets_path }}/backup/` | Last 5 |

### 6.2 Rollback Playbook: `rollback-firm.yml`

```yaml
# Pseudocode — rollback execution
- name: Assert rollback target exists
  # validate snapshot manifest for target version

- name: Stop current platform services
  # docker compose down for platform + agents (keep core running)

- name: Restore previous compose configuration
  # copy backed-up compose file into place

- name: Pull previous image tag
  # docker_image pull with rollback_tag

- name: Restart services with restored config
  # docker compose up -d

- name: Verify rollback health
  # import verify.yml from each role
```

**Trigger Conditions**:
- Manual: `ansible-playbook rollback-firm.yml -e rollback_to=<timestamp>`
- Automatic: If health checks fail for > 5 minutes post-deploy

### 6.3 Health Check Verification

| Layer | Check | Interval | Failure Action |
|-------|-------|----------|----------------|
| **Infrastructure** | Docker daemon responsive | Every 60s | Alert, retry ×3 |
| **Core** | PostgreSQL `pg_isready`, Redis `PING` | Every 30s | Restart container, alert |
| **Agents** | Orchestrator `/healthz` HTTP 200 | Every 30s | Scale worker pool to 0, alert |
| **Platform** | Paperclip `/healthz` via Tailscale IP | Every 30s | Trigger automatic rollback |
| **Security** | Secret file permissions `0400` | Every 5m | Correct permissions, alert |
| **End-to-End** | Synthetic login + task creation flow | Every 5m | Page on-call |

**Verification Pseudocode** (integrated into each role's `verify.yml`):
```yaml
# tasks/verify.yml pattern
- name: Wait for service port
  ansible.builtin.wait_for:
    host: 127.0.0.1
    port: "{{ service_port }}"
    timeout: 60

- name: HTTP health probe
  ansible.builtin.uri:
    url: "http://127.0.0.1:{{ service_port }}/healthz"
    status_code: 200
  retries: 5
  delay: 10

- name: Register health outcome
  ansible.builtin.set_fact:
    health_results: "{{ health_results | default({}) | combine({inventory_hostname: 'pass'}) }}"
```

---

## 7. Tailscale Integration

### 7.1 Network Model

All firm hosts exist on a private Tailscale mesh (`tailnet`). No ports are exposed to the public internet.

```
[Admin Workstation] ──Tailscale SSH──► [prod-node-01 : 100.106.20.102]
                                          │
                                          ├── 127.0.0.1:3100  Paperclip (via tailscale serve)
                                          ├── 127.0.0.1:4100  Hermes (internal only)
                                          ├── 127.0.0.1:5432  PostgreSQL (internal only)
                                          └── 127.0.0.1:6379  Redis (internal only)
```

### 7.2 Tailscale ACL Tags

| Tag | Devices | Capabilities |
|-----|---------|--------------|
| `tag:openclaw-prod` | Production node | Accept SSH from `group:ops`, serve 3100 |
| `tag:openclaw-staging` | Staging node | Accept SSH from `group:ops`, serve 3100 |
| `tag:openclaw-dev` | Dev node | Accept SSH from `group:dev`, serve 3100 |

### 7.3 Tailscale Serve / Funnel Policy

- **Serve**: Paperclip (`127.0.0.1:3100`) is exposed via `tailscale serve` on the node's Tailscale IP.
- **Funnel**: Disabled by default. If public ingress is required for webhooks, enable selectively via ACLs, not playbook default.
- **DNS**: Magic DNS enabled (`prod-node-01.tailnet-name.ts.net`) for internal service discovery if Hermes requires hostname-based routing.

### 7.4 Ansible Variables for Tailscale

```yaml
# group_vars/tailscale.yml
tailscale_enable_ssh: true
tailscale_serve_enabled: true
tailscale_serve_services:
  paperclip:
    source: "tcp/100.106.20.102:3100"
    destination: "tcp/127.0.0.1:3100"
    funnel: false
```

### 7.5 Operational Commands

```bash
# Verify mesh connectivity from control node
ansible all -i inventories/prod -m ping

# Check Tailscale status on remote
ansible prod-node-01 -i inventories/prod -a "tailscale status"

# View active serves
ansible prod-node-01 -i inventories/prod -a "tailscale serve status"
```

---

## 8. CI/CD Integration Points

| Stage | Ansible Integration | Secrets Source |
|-------|---------------------|----------------|
| **Build** | None (build occurs in GitHub Actions, pushes to registry) | — |
| **Deploy Dev** | `ansible-playbook -i inventories/dev` on merge to `develop` | Repository secrets (`TS_AUTH_KEY_DEV`) |
| **Deploy Staging** | `ansible-playbook -i inventories/staging` on tag `v*-rc.*` | Repository secrets (`TS_AUTH_KEY_STAGING`) |
| **Deploy Prod** | `ansible-playbook -i inventories/prod` manual approval gate | Vault / 1Password (`TS_AUTH_KEY_PROD`) |
| **Rollback** | `ansible-playbook rollback-firm.yml` on pipeline failure or manual trigger | Same as deploy stage |

---

## 9. Security Hardening Checklist

- [ ] All containers bind to `127.0.0.1`; no `0.0.0.0` exposure.
- [ ] `DOCKER-USER` iptables chain drops unexpected ingress before Docker's own rules.
- [ ] UFW default-deny incoming; allow only Tailscale UDP/41641 and loopback.
- [ ] Secrets files are `0600`, owned by root, stored outside volume mounts.
- [ ] Encryption keys (`age`) generated on-host, never transmitted over Ansible unless vaulted.
- [ ] Node.js and Docker installed from official APT repositories with GPG verification.
- [ ] Tailscale ACLs restrict SSH to `group:ops` for production.

---

## 10. Operational Runbooks (Reference)

| Scenario | Command / Action |
|----------|------------------|
| Full deploy | `ansible-playbook -i inventories/prod deploy-firm.yml` |
| Deploy single role | `ansible-playbook ... --tags platform` |
| View logs | `ansible ... -a "docker logs misjustice-paperclip-1"` |
| Restart service | `ansible ... -a "docker compose -f /opt/misjustice/compose.yml restart paperclip"` |
| Rotate secrets | `ansible-playbook ... --tags security -e security_rotate=true` |
| Rollback | `ansible-playbook -i inventories/prod rollback-firm.yml -e rollback_to=20260427-144721` |
| Health check | `ansible-playbook -i inventories/prod deploy-firm.yml --tags verify` |

---

*Document Version: 1.0*
*Applies to: openclaw-ansible >= 2.0, NemoClaw >= 0.5*
