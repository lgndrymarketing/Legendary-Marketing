# Legendary Marketing — Dashboard Design System

Style reference: four screenshots of a developer-tool dashboard (Firecrawl).
This document extracts that system in detail and maps it onto Legendary
Marketing's agency product. **Reference is for style only — all content,
naming, and features are Legendary Marketing's.**

---

## 1. Analysis of the reference

### 1.1 Overall character
- **Flat, editorial, engineered.** Zero card shadows in the resting state.
  Structure comes from **1px hairline rules** (`#ECECEC`-class borders) that
  run full-bleed across sections, like a printed spec sheet. Cards are
  regions between rules, not floating boxes.
- **White is the material.** Content sits on pure `#FFFFFF`; the sidebar sits
  on a barely-tinted off-white (`#FAFAFA`). No grays-on-grays layering.
- **One accent.** A hot orange (≈ `#F54A00` → `#FF6A2B` range) is used with
  extreme discipline: the primary button, active nav tint, chart strokes/
  fills, tiny glyphs, key numerals. Everything else is near-black and muted
  gray. Green appears only as a status semantic (`COMPLETED`).
- **Two typographic voices.** A clean geometric sans for UI copy, and a
  **monospace voice for anything technical**: table cell values (`/CRAWL`),
  statuses (`COMPLETED`), axis labels (`08/29`, `Week 1, Sep 2025`), masked
  keys (`fc-9•••aebf`), and signature **bracketed micro-headers** —
  `[ 3 / 3 ] · HISTORICAL BROWSER CONCURRENCY`, `[ LIVE ]`.
- **Decorative texture, sparingly.** Dotted-matrix patterns (a field of tiny
  dots forming a shape) decorate header bands and chart backgrounds. Section
  rules occasionally carry a subtle crosshatch at the gutters.

### 1.2 Screenshot 1 — Overview
- **Sidebar (~190px, fixed):** logo lockup top; pill search field with `⌘K`
  kbd hint; vertical nav of icon+label rows (13px). Active row = soft orange
  tint pill (`#FFF3EC`-ish, radius ~8px) + orange icon/text. A collapsible
  group ("Extract") with chevron and indented children. Pinned bottom: a
  "What's New (6)" tinted announcement card, the account email row, and a
  full-width "Collapse" button.
- **Top bar:** left — workspace switcher pill (tiny orange square badge +
  name + chevron). Right — icon-only bell (with orange count badge when
  unread), "Help" and "Docs" ghost buttons with icons, and the single solid
  **orange Upgrade CTA** (radius ~10px).
- **"Explore our endpoints" band:** heading + muted subtitle, then a
  **4-across feature grid separated by vertical hairlines** (no cards): tiny
  orange glyph, `Title →` with arrow, two-line muted description, optional
  `NEW` chip (orange tint, uppercase, tiny).
- **Chart region:** title ("Scraped pages - Last 7 days") + muted caption
  left; **huge numeral top-right** (`2`). Orange line chart with soft orange
  gradient fill fading to transparent, drawn over a faint dotted texture.
  Mono axis dates.
- **Right rail:** "API Key" — label + caption, then a masked mono key inside
  a tinted pill with eye/copy icon-buttons. "MCP Integration" — a JSON code
  block, mono, with warm-orange keys and muted strings.
- **"Concurrent Browsers `[ LIVE ]`":** sans title + bracketed mono badge;
  caption with an inline orange text link ("upgrade plan"); a **circular
  progress ring** ("0" inside) + "of 2 active browsers".

### 1.3 Screenshot 2 — Activity Logs
- **Hero header band:** oversized title (~40px, bold, tight tracking) +
  muted subtitle, with a **dotted-matrix skyline artwork** right-aligned in
  the band. Band closed by a full-width hairline.
- **Filter row:** search input (pill), "All Endpoints" dropdown pill with
  filter icon, spacer, right-aligned "Last 7 days" calendar pill.
- **Table:** UPPERCASE letter-spaced micro column headers in muted gray;
  endpoint cells in mono caps (`/CRAWL`); URL truncated muted; status
  `COMPLETED` in **green uppercase mono**; numeral credits; two-line
  timestamp (date / time stacked, mono-ish); per-row **icon action button in
  a bordered rounded square**; hairline row dividers; footer `Page 1` +
  chevron pagination.

### 1.4 Screenshot 3 — Usage
- **Segmented control** (Weekly / Monthly): rounded track, active segment =
  white pill with hairline+shadow.
- **Split stat-chart cards sharing a vertical hairline:** small title +
  mono date-range caption; **big right-aligned stat with unit** ("21
  credits", "358 tokens"); orange area/line chart; mono axis.
- **Bracketed section header:** left orange tick ▍, then
  `[ 3 / 3 ] · HISTORICAL BROWSER CONCURRENCY` in mono uppercase with orange
  numerals.
- **Wide chart** with a **dashed reference line** labeled in mono
  (`MAX CONCURRENCY: 2`) and an orange spike series; mono time axis.

### 1.5 Screenshot 4 — Auth
- **Blueprint frame:** a centered ~300px column defined by two faint
  full-height vertical hairlines; horizontal hairlines section the column
  (logo band / tab band / form band / oauth band / legal band). Everything
  centered.
- Log In / Sign Up **tab toggle** (active = white pill + shadow); labeled
  inputs with **orange focus ring**; full-width orange primary button;
  full-width **black** OAuth buttons; tiny legal line with underlined links.

---

## 2. Token spec (maps to `globals.css`)

### 2.1 Color
| Token | Value | Usage |
| --- | --- | --- |
| `--background` | `#FFFFFF` | content surface |
| `--sidebar` | `#FAFAFA` | sidebar / rails |
| `--foreground` | `#0F1010` | primary text |
| `--muted-foreground` | `#7A7F85` | captions, table headers |
| `--border` | `#ECECEC` | **hairlines everywhere** |
| `--primary` / `--color-orange` | `#F54A00` | THE accent |
| `--color-orange-light` | `#FF7A33` | gradients, chart tops |
| `--color-orange-dark` | `#D63F00` | hover/press |
| orange tint bg | `#FFF3EC` (`bg-orange/8` ≈) | active nav, chips, key pill |
| `--success` | `#16A34A` | `COMPLETED`-class statuses |
| `--warning` | `#D97706` | pending |
| `--destructive` | `#DC2626` | errors, rejected |

Dark mode: keep tokens defined (near-black surfaces, same orange) but the
product is **light-first**; dark must merely remain legible.

### 2.2 Type
- **Sans:** Geist Sans — UI copy, titles. Page titles 32–40px/700/tight.
  Card titles 15–16px/600. Body 14px. Captions 12–13px muted.
- **Mono:** Geist Mono (add `geist/font/mono`) — data values, statuses,
  axis labels, keys, timestamps, micro-headers.
- **Micro-label style:** 11px, uppercase, `tracking-[0.08em]`, muted — table
  headers and section eyebrows.
- **Bracket label style:** mono 11–12px uppercase:
  `[ 4 / 6 ] · ACTIVE CAMPAIGNS` — numerals orange, label muted.

### 2.3 Surfaces & structure
- Radius: inputs/buttons 10px; pills/full rounds for chips; cards 12px when
  free-standing, **0 when defined by section rules**.
- Shadows: none at rest. Hover on interactive rows/cards = background tint
  (`bg-muted/50`) not elevation. Popovers/dropdowns may use a soft shadow.
- Section rule: `border-t border-border` running the full content width.
- Divided grids: CSS grid + `divide-x divide-border` (feature rows), never
  gaps with floating cards.
- Dotted texture utility: `radial-gradient(circle, #E5E5E5 1px, transparent 1px)`
  at ~12px spacing, masked to fade — used behind charts/header bands.

---

## 3. Layout spec

### 3.1 App shell (admin + client portals)
```
┌──────────┬──────────────────────────────────────────────┐
│ SIDEBAR  │ TOPBAR: [workspace/role pill]   bell · theme │
│ 232px    │            · user · [orange primary CTA]     │
│  logo    ├──────────────────────────────────────────────┤
│  search  │ CONTENT (max-w none, px-8, sections divided  │
│  nav     │ by full-width hairlines)                     │
│  ...     │                                              │
│  bottom: │                                              │
│  email   │                                              │
│  collapse│                                              │
└──────────┴──────────────────────────────────────────────┘
```
- Sidebar: `bg-sidebar`, `border-r border-border`. Nav item: 13px, icon 16px,
  rounded-lg px-3 py-2; active = orange tint bg + orange text with a
  **motion `layoutId` pill** that glides between items. Role-gated exactly as
  today. Bottom: account email row + Collapse toggle (collapses to 64px
  icon rail, animated width).
- Topbar: h-14, hairline bottom. Left: role/workspace pill (logo square +
  "Legendary Marketing" + role chip). Right: GlobalSearch (as ⌘K pill),
  NotificationBell, ThemeToggle, UserButton, and one orange CTA
  (admin: "New Task"→ projects; client: "New Project" → onboarding).
- Mobile: sidebar becomes an overlay drawer (slide-in, backdrop blur).

### 3.2 Page anatomy
1. **Hero band** (Activity-Logs style): oversized title + muted subtitle,
   optional dotted-matrix decoration right, closed by a hairline.
2. **Toolbar row** when the page has filters: search pill + filter pills
   left, date/action pills right.
3. **Content sections** separated by hairlines; stat headers use the
   title-left / **big-numeral-right** pattern.

### 3.3 Signature components to build/restyle
- `AppSidebar`, `AppTopbar`, `AppShell` (client component wrapping both).
- `PageHero` (replaces PageHeader on portal pages): big title, subtitle,
  optional right decoration + actions.
- `StatHeader`: small title + mono caption left, big numeral (count-up) right.
- `MetricRing`: circular progress (SVG) — e.g. "3 of 5 phases complete".
- `BracketLabel`: `[ n / m ] · LABEL` mono micro-header with orange tick.
- `Sparkline` / `AreaChart`: pure-SVG orange line with gradient fill +
  draw-in animation, dotted backdrop, mono axis. (No chart library.)
- `DataTable` styling: uppercase micro headers, mono value cells, status in
  uppercase mono color-coded, bordered-square icon actions, hairline rows.
- `SegmentedTabs`: Weekly/Monthly-style control (white active pill).
- Masked-value pill (for GHL/Ably key status on Integrations) with
  eye/copy icon-buttons.
- Auth pages: blueprint hairline frame, centered column, tab toggle.

---

## 4. Motion spec — "Apple-level"

**Physics:** never linear. Default easing `cubic-bezier(0.22, 1, 0.36, 1)`
(ease-out-quint feel) or spring `{ type: "spring", stiffness: 260,
damping: 30 }`. Durations: micro 150–200ms, standard 300–350ms, page
400–450ms. All animation must respect `prefers-reduced-motion` (the global
CSS already zeroes durations).

1. **Page transitions** — `template.tsx` in both portal route groups wraps
   content in a motion div: enter `opacity 0 → 1, y 12 → 0, scale 0.995 → 1`
   (400ms). Feels like a sheet settling.
2. **Staggered reveals** — hero band, then toolbar, then sections cascade
   with 40–60ms stagger (`motion` variants with `staggerChildren`).
   Table/list rows stagger 25ms, capped at ~12 rows.
3. **Sidebar active pill** — shared `layoutId="nav-pill"` orange tint pill
   glides between nav items on route change (spring).
4. **Count-up numerals** — big stats animate from 0 with an ease-out count
   (~700ms) via `animate()`/`useSpring` from `motion/react`.
5. **Chart draw-in** — SVG paths animate `pathLength 0 → 1` (800ms
   ease-out); gradient fill fades in after (200ms delay).
6. **Ring fill** — MetricRing animates `strokeDashoffset` on mount (spring).
7. **Micro-interactions** — buttons: `active:scale-[0.98]`, 150ms; icon
   buttons tint on hover; arrow links slide the arrow 2px on hover; table
   rows tint; copy buttons flash a ✓ swap (150ms crossfade).
8. **Collapse/expand** — sidebar width and section accordions animate
   height/width with springs, content fades 100ms behind.
9. **Skeletons** — existing shimmer stays; swap-in content crossfades
   (150ms) instead of popping.
10. **Notification bell** — badge pops in with spring scale 0 → 1;
    dropdown scales from origin top-right (200ms).

Implementation: `motion/react` (already a dependency) for all of the above;
shared variants live in `src/lib/motion.ts` (`pageEnter`, `cascade`,
`cascadeItem`, `springSnappy`, `easeOutExpo`).

---

## 5. Mapping to Legendary Marketing content

| Reference element | Our version |
| --- | --- |
| "Explore our endpoints" 4-up | Admin: Projects / Leads / Payments / Team quick-nav; Client: Project / Messages / Files / Billing |
| Scraped-pages chart + big numeral | Admin: revenue & leads trend; Client: phase progress |
| API Key masked pill | Integrations: GHL/Ably status pills |
| MCP JSON block | (omit — no equivalent; keep Integrations copy) |
| Concurrent browsers ring | Admin: "campaigns live" ring; Client: "phases complete" ring |
| Activity Logs table | Admin: Leads, Payments, Projects tables; Client: invoices/files |
| `[ LIVE ]` bracket | Real-time messaging state; `[ 4 / 6 ] · PHASES` |
| Upgrade CTA | Admin "New Task"/primary action; Client "New Project" |
| Auth blueprint frame | /sign-in, /sign-up |

**Non-negotiables carried over:** all existing functionality, routes, RBAC
and API contracts stay identical. This is presentation + shell only.
