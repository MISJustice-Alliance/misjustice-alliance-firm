# MISJustice Alliance Website

Migrated from `/opt/legal-advocacy-web/` on 2026-04-28.

## Structure

| Directory | Contents |
|---|---|
| `frontend/` | React 18 + TypeScript + TailwindCSS + Vite SPA |
| `backend/` | Node.js/Express CMS and API |
| `assets/` | Static assets (logos, images, QR codes) |
| `backups/site-backup/` | Site backup archives |
| `content-archive/` | Content archive with case materials and evidence |
| `scripts/` | Automation and build scripts |
| `mission-statement.md` | Mission statement |

## Tech Stack

- **Frontend:** React 18+, TypeScript, TailwindCSS, Vite
- **Backend:** Node.js 18+, Express, PostgreSQL
- **Deployment:** Permaweb (Arweave) via Turbo AR.io

## Quick Start

```bash
cd frontend && npm install && npm run dev
cd backend && npm install && npm run dev
```

## Notes

- `node_modules/` excluded from migration — run `npm install` in each directory
- Source repo: `/opt/legal-advocacy-web/`
