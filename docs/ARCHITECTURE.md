# Architecture

## System overview

```
                 ┌────────────────────────────────────────────┐
   Browser ───▶  │  Next.js app (App Router, standalone)      │
                 │                                            │
                 │  Server Components ──▶ lib/analytics/*  ───┼──▶ PostgreSQL
                 │  Route Handlers    ──▶ (zod + RBAC)        │      (Prisma)
                 │  Middleware (edge) ──▶ Auth.js JWT check   │
                 │            │                               │
                 │            └─▶ lib/cache ──▶ Redis (opt.)  │
                 │            └─▶ lib/mail  ──▶ SMTP (opt.)   │
                 │            └─▶ S3-compatible storage (opt.)│
                 └────────────────────────────────────────────┘
```

Single deployable unit (the Next.js server) backed by PostgreSQL, with optional
Redis and SMTP integrations that degrade gracefully when absent.

## Request flow (dashboard page)

1. **Middleware** (`src/middleware.ts`) runs the adapter-free Auth.js config at
   the edge: unauthenticated requests to `/dashboard/*` redirect to `/login`.
2. The **layout** (`src/app/dashboard/layout.tsx`) resolves the *org context*:
   session → memberships → active workspace (an httpOnly `ih_org` cookie, with
   fallback to the first membership) → active project + role.
3. The **page** parses the global date range from URL search params
   (`resolveDateRange`) — the current window plus the equal-length window
   immediately before it, for period-over-period deltas.
4. Each dashboard **section is an async Server Component inside `<Suspense>`**,
   so sections stream in independently with skeleton fallbacks. Sections call
   query services in `src/lib/analytics/*`; nothing is fetched client-side for
   the initial render.
5. Query services use Prisma (or tagged raw SQL for `date_trunc` bucketing and
   `COUNT(DISTINCT …)`), wrapped in a **read-through cache** (`cached()`):
   Redis when configured, in-memory otherwise, 60–300s TTLs keyed by
   project + window.
6. Data flows into **client chart components** (Recharts) as plain props.
   Interactivity that changes *what* is queried (granularity, filters, pages)
   is URL-driven so the server re-renders; purely visual toggles stay client-side.

## Multi-tenancy & authorization

- **Tenancy chain:** `User ──Membership(role)──▶ Organization ──▶ Project ──▶ analytics data`.
  Every analytics query is scoped by `projectId`; every resource query by `orgId`.
  IDs never cross tenants: API handlers verify ownership before acting.
- **RBAC** (`src/lib/auth/rbac.ts`): a rank hierarchy (Owner > Admin > Analyst >
  Viewer) plus a permission→minimum-role map (`can(role, permission)`).
  Enforced twice: pages/components hide affordances; route handlers throw 403.
- **Auth.js v5** with JWT sessions (edge-compatible), Prisma adapter for
  OAuth-readiness, bcrypt (cost 12) credential verification, and login rate
  limiting. Password reset uses single-use, SHA-256-hashed, 1-hour tokens.

## API layer

Route handlers under `src/app/api/*` share one contract via `withErrorHandling`:

- zod `ZodError` → **422** with per-field issues
- `ApiError` (unauthorized/forbidden/notFound/badRequest/tooManyRequests) → its status
- anything else → **500** with a generic message (details only server-logged)

Mutations record an **audit trail** (`recordAudit`) and sensitive/abusable
endpoints (register, login, forgot/reset) are **rate-limited** per IP
(Redis fixed-window, in-memory fallback).

## The report builder

`runReport` (`src/lib/analytics/reports.ts`) compiles a validated
`{metric, dimension, filters}` config into SQL. Identifiers come exclusively
from whitelisted maps per metric family; user input only ever binds as
parameters — the builder cannot be steered into arbitrary SQL. Saved reports
store the config JSON and re-validate it on every run.

## Performance decisions

- Server-rendered, streamed sections: no client data fetching waterfall.
- Composite indexes on every hot path (`(projectId, occurredAt)` and friends —
  see [DATABASE.md](./DATABASE.md)).
- Aggregations happen in Postgres (`date_trunc`, `FILTER`, `COUNT(DISTINCT)`),
  never by loading rows into JS. Tables paginate server-side (≤100/page);
  exports cap at 10k rows.
- Short-TTL Redis caching absorbs dashboard refresh storms.
- Charts are client components at the leaf only; Recharts is code-split per route
  by Next automatically.

## Failure & degradation

| Dependency | When missing/down |
|---|---|
| Redis | cache + rate limits fall back to per-instance memory |
| SMTP | emails logged to server console (dev mode) |
| S3 | exports stream directly to the browser |
| DB | `/api/health` reports unhealthy → orchestrator restarts/kills traffic |

## Background work

Alert evaluation and scheduled report delivery are modeled (schema fields
`frequency`, `schedule`, `lastTriggeredAt`, `lastRunAt`) and designed to run as
a worker consuming a Redis queue (see the compose `app` profile for the shape
of a second process). The evaluation loop is intentionally out of scope of the
web process so it can scale independently.
