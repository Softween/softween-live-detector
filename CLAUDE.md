# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time website uptime monitoring and public status page platform. Monitors HTTP/TCP/DNS/PING endpoints, tracks incidents, sends alerts, and provides a public Turkey internet infrastructure dashboard. Includes AI-powered blog generation. pnpm monorepo with 3 packages.

**Live URL**: livedetector.softween.com

## Commands

```bash
# Development (from root)
pnpm install                     # Install all workspace deps
pnpm dev:worker                  # Hono API (:8787)
pnpm dev:web                     # Vite frontend (proxies /api → :8787)
pnpm build:shared                # Build shared types package
pnpm build:web                   # Build React app
pnpm deploy:worker               # Deploy Worker to Cloudflare
pnpm deploy:web                  # Deploy Pages to Cloudflare
pnpm typecheck                   # Typecheck all packages

# Database
pnpm db:migrate:local            # Apply D1 migrations locally
pnpm db:migrate:remote           # Apply to production D1
```

## Tech Stack

### Worker (`apps/worker`)
- **Runtime**: Cloudflare Workers (`nodejs_compat`)
- **Framework**: Hono v4
- **Database**: D1 (SQLite) — `live-checker-db`
- **KV**: Round-robin offsets, cache
- **AI**: Cloudflare Workers AI (blog generation)
- **Email**: Resend API
- **Notifications**: Email + Telegram + Webhooks

### Web (`apps/web`)
- **Build**: Vite 6 + React 19 + TypeScript
- **Routing**: React Router 7
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Hook Form + context-based auth
- **Charts**: Recharts
- **i18n**: react-i18next (TR/EN)
- **Analytics**: Mixpanel

### Shared (`packages/shared`)
- Types, constants, Zod validation schemas
- Imported as workspace dependency

## Architecture

```
apps/
├── worker/src/
│   ├── index.ts              # Hono app setup
│   ├── cron/scheduled.ts     # 5-min cron handler (monitoring engine)
│   ├── routes/               # 16 modules: auth, monitors, checks, visitor,
│   │                         #   status-page, heartbeat, apikeys, teams, incidents,
│   │                         #   sla, webhooks, turkey, blog, groups, tags, bulk
│   ├── services/             # 20 services: ping, notification, heartbeat, ssl,
│   │                         #   turkey-ping, turkey-seed, turkey, trends, blog,
│   │                         #   ai-blog, sla, cleanup, bulk-import, auth, monitor,
│   │                         #   check, group, tag, apikey, team
│   ├── middleware/            # CORS, auth (JWT), rate-limit
│   ├── lib/                  # Utilities
│   └── migrations/           # 6 SQL migration files
├── web/src/
│   ├── App.tsx               # Router setup (20 lazy-loaded pages)
│   ├── pages/                # Dashboard, MonitorDetail, AddMonitor, Settings,
│   │                         #   StatusPage, Heartbeats, ApiKeys, Teams,
│   │                         #   TurkeyDashboard, Blog, ManageGroups, BulkImport
│   ├── components/           # UI, layout
│   ├── context/              # Auth, Theme
│   ├── hooks/                # useAuth, etc.
│   ├── api/                  # API client
│   └── i18n/                 # TR/EN translations
packages/
└── shared/src/
    ├── types.ts              # User, Monitor, Check, Incident, TurkeySite, BlogPost...
    ├── constants.ts          # Limits, intervals, retention periods
    └── validation.ts         # Zod schemas
```

### Scheduled Tasks (Cron — every 5 min)

| Task | Schedule |
|------|----------|
| Monitor pings (25/batch, round-robin) | Every 5 min |
| Status change detection → incidents | Every 5 min |
| Check results → DB | Every 5 min |
| Notifications (email/Telegram/webhook) | Every 5 min |
| Heartbeat expiry validation | Every 5 min |
| Turkey site monitoring (15/batch) | Every 5 min |
| Data cleanup (checks >30d, notifications >90d) | Daily |
| SSL certificate expiry checks | Daily |
| Template blog generation | Saturday 03:00 UTC |
| AI blog generation | Sunday 04:00 UTC |

### Monitor Types

HTTP (all methods), TCP, DNS, PING — with custom headers, keyword validation, configurable timeouts, expected status codes, maintenance windows.

### Notification Channels

Email (Resend), Telegram, Webhooks — with 15-min cooldown, slow response detection, weekly reports.

## Cloudflare Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `DB` | D1 | live-checker-db |
| `KV` | KV | Round-robin offsets, cache |
| `AI` | AI | Blog generation (Cloudflare Workers AI) |

## CI/CD

| Workflow | Trigger | Action |
|----------|---------|--------|
| `deploy-web.yml` | Push to main (apps/web/ or packages/shared/) | Build → deploy to Cloudflare Pages (`softween-live-checker`) |
| `deploy-worker.yml` | Push to main (apps/worker/ or packages/shared/) | Typecheck → deploy to Cloudflare Workers |

## Key Limits

| Limit | Value |
|-------|-------|
| Max monitors/user | 25 |
| Max heartbeats/user | 5 |
| Check interval | 300s (5 min) |
| Cron batch size | 25 monitors |
| Turkey batch size | 15 sites |
| Data retention (checks) | 30 days |
| Notification log | 90 days |
| JWT expiry | 7 days |

## Gotchas

- **pnpm required** — `pnpm-workspace.yaml` defines workspace
- Internal name is "live-checker", marketing name is "livedetector"
- Node >=20, pnpm v9
- No test framework configured
- No staging environment — main branch is production
- D1 migrations must be applied manually (local and remote separately)
- Worker uses `wrangler.jsonc` (JSON with comments)
- Cron batching via round-robin offsets in KV to stay within subrequest limits

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current
