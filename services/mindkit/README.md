# MindKit MCP Sidecar

Internal-only reasoning sidecar for MISJustice Alliance.

## Purpose

MindKit provides structured sequential thinking for de-identified, Tier-2-safe analysis prompts. It returns confidence-scored reasoning traces for Open Notebook, MCAS, and Veritas.

## Runtime contract

- Hostname: `mindkit.internal`
- Port: `3100`
- Egress: none
- Allowed data tier: `T2` only

## Endpoints

- `GET /health` — readiness probe
- `POST /think` — structured reasoning trace generation

## Request example

```json
{
  "prompt": "Determine the strongest legal theory from the de-identified summary.",
  "mode": "analytical",
  "custom_lens": "legal-theory",
  "matter_id": "MCAS-1234",
  "data_tier": "T2"
}
```

## Build

```bash
cargo build --release
```

## Run

```bash
cargo run --bin mindkit-mcp
```

## Notes

This is the initial service scaffold. The MCP transport layer and Open Notebook / MCAS writers will be added after the first end-to-end tool test.
