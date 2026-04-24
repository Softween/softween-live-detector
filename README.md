# Softween Live Detector

Real-time website uptime monitoring and public status page platform. Monitors HTTP/TCP/DNS/PING endpoints, tracks incidents, sends alerts, and provides a public Turkey internet infrastructure dashboard. Includes AI-powered blog generation.

**Live**: [livedetector.softween.com](https://livedetector.softween.com)

> Full architecture, conventions, and operational details live in [`CLAUDE.md`](./CLAUDE.md).

## Structure

pnpm monorepo with 3 packages:

```
apps/
├── worker/              # Hono API on Cloudflare Workers
└── web/                 # Vite + React 19 dashboard
packages/
└── shared/              # Types, constants, Zod schemas
```

## Tech Stack

- **Worker**: Cloudflare Workers (`nodejs_compat`), Hono v4, D1 (SQLite), KV, Workers AI (blog generation), Resend (email)
- **Web**: Vite 6 + React 19 + TypeScript, React Router 7, Tailwind + shadcn/ui, Recharts, react-i18next (TR/EN), Mixpanel
- **Shared**: workspace package with types, constants, Zod validation schemas

## Quick Start

```bash
pnpm install               # Install all workspace deps
pnpm dev:worker            # Hono API (:8787)
pnpm dev:web               # Vite frontend (proxies /api → :8787)
pnpm typecheck             # Typecheck all packages
```

Deployment:

```bash
pnpm deploy:worker         # Deploy worker to Cloudflare
pnpm deploy:web            # Deploy web to Cloudflare Pages
```

Database:

```bash
pnpm db:migrate:local      # Apply D1 migrations locally
pnpm db:migrate:remote     # Apply to production D1
```

## Features

- **Monitor types**: HTTP (all methods), TCP, DNS, PING — with custom headers, keyword validation, configurable timeouts, expected status codes, maintenance windows.
- **Notification channels**: Email (Resend), Telegram, Webhooks — with 15-minute cooldown, slow response detection, weekly reports.
- **Scheduled tasks**: monitor pings (25/batch, round-robin, every 5 min), Turkey site monitoring (15/batch, every 5 min), status-change → incident detection, SSL expiry checks (daily), AI blog generation (Sunday 04:00 UTC).
- **Public dashboards**: per-monitor status pages, Turkey internet infrastructure dashboard, heartbeats.

## CI/CD

| Workflow            | Trigger                                                    | Action                                           |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| `deploy-web.yml`    | push to main (`apps/web/` or `packages/shared/` changes)   | Build → deploy to Cloudflare Pages               |
| `deploy-worker.yml` | push to main (`apps/worker/` or `packages/shared/` changes)| Typecheck → deploy to Cloudflare Workers         |

No staging environment — main branch is production.

## Key Limits

| Limit                      | Value              |
| -------------------------- | ------------------ |
| Max monitors per user      | 25                 |
| Max heartbeats per user    | 5                  |
| Check interval             | 300s (5 min)       |
| Cron batch size            | 25 monitors        |
| Turkey batch size          | 15 sites           |
| Data retention (checks)    | 30 days            |
| Notification log retention | 90 days            |
| JWT expiry                 | 7 days             |

## Naming Note

Internal package name is `live-checker`; marketing name is `livedetector`.
