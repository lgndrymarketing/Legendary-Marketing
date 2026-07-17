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

## GoHighLevel as the backbone

GHL is the agency's CRM/pipeline of record; this app mirrors into it at every
touchpoint (all best-effort — nothing user-facing fails if GHL is down or
unconfigured):

| Event                              | GHL action                                             |
| ---------------------------------- | ------------------------------------------------------ |
| Website lead captured              | Contact upsert, tagged `website-lead` + source         |
| Client signs up (Clerk webhook)    | Contact upsert, tagged `client-portal`                 |
| Client completes onboarding        | Opportunity created on their contact                   |
| GHL invoice/opportunity changes    | Inbound webhook updates `payments`/`projects`          |
| Admin "Sync Now" (`/admin/integrations`) | Pulls opportunities into the revenue view        |

Lead flow: the public `/get-started` funnel and `/contact` form POST to
`/api/leads`, which stores the lead locally (`leads` table) and syncs it to
GHL. Staff triage leads at `/admin/leads`; tags on the GHL contact are the
hook for GHL-side automations (follow-up sequences, pipelines, booking).

Campaigns: staff track each client's ad campaigns (`ad_campaigns` table,
managed from the admin project view; clients see a read-only version), with
`ghlCampaignId` reserved for pulling GHL attribution/reporting later.

## Integrations

- **GoHighLevel** — `src/lib/ghl.ts` client (contacts, opportunities,
  transactions, appointments), `/admin/integrations` settings page,
  `/api/integrations/ghl/sync` + `/api/webhooks/ghl`. Revenue in
  `/admin/payments` is tagged by `source` (`creem` vs `ghl`).
- **Ably** — `src/lib/ably.ts` (server) issues scoped tokens from
  `/api/ably/token`; `src/hooks/use-ably-channel.ts` powers live messaging.

See `.env.local.example` for the full list of required environment variables.
