# Legendary Marketing

Client management platform for Legendary Marketing — a performance marketing
agency focused on paid advertising, lead-capture funnels, and CRM automation.

This app is a fork/rebrand of an agency-tooling scaffold, stripped of the
prior "AI automation agency" product line and rebuilt around two areas:

- **Marketing site & funnel** — public site, service pages, and a lead-capture
  onboarding flow (`/onboarding`) that creates a project and routes to checkout.
- **Client portal** (`/dashboard`) — clients track project phases, message the
  agency in real time, view files/invoices, and request revisions.
- **Agency admin** (`/admin`) — staff (Admin / Project Manager / VA, see
  `src/lib/permissions.ts`) manage clients, projects, a per-project Kanban task
  board, team roles, billing, and the GoHighLevel integration.

## Stack

- Next.js (App Router) + TypeScript + Tailwind v4
- Clerk (auth) · Neon Postgres + Drizzle ORM (data)
- Creem.io (client project checkout) · GoHighLevel (agency CRM/revenue sync)
- Ably (real-time client ↔ agency messaging)

## Getting Started

```bash
pnpm install
cp .env.local.example .env.local   # fill in Clerk, Neon, Creem, Ably, GHL keys
pnpm drizzle-kit generate          # once DATABASE_URL is set
pnpm drizzle-kit migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Roles & Access

| Role              | Access                                                             |
| ----------------- | ------------------------------------------------------------------- |
| `client`          | Their own projects, messaging, files, billing                      |
| `va`               | Assigned tasks, project messaging (scoped)                         |
| `project_manager` | All client projects, task board, phases, messaging                 |
| `admin`           | Everything — billing, team roles, GoHighLevel integration settings |

Promote a signed-up client to staff from **Admin → Team**.

## Integrations

- **GoHighLevel** — `src/lib/ghl.ts` client, synced via `/admin/integrations`
  and `/api/webhooks/ghl`. Revenue shown in `/admin/payments` is tagged by
  `source` (`creem` vs `ghl`).
- **Ably** — `src/lib/ably.ts` (server) issues scoped tokens from
  `/api/ably/token`; `src/hooks/use-ably-channel.ts` powers live messaging.

See `.env.local.example` for the full list of required environment variables.
