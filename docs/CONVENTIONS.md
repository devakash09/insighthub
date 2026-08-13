# InsightHub — Engineering Conventions

Read this before adding any page or API route. The foundation (auth, services,
charts, shell) is complete — build on it, don't re-invent it.

## Stack & version gotchas

- **Next 16** (App Router). `params` and `searchParams` in pages are **Promises** — `const p = await searchParams`.
- **Prisma 6** — import `db` from `@/lib/db`; types/enums from `@prisma/client`.
- **zod 4** — `schema.parse()`; error handling is centralized (see API section).
- **Recharts 3**, **lucide-react 1.x**, **Tailwind v4** (design tokens in `src/app/globals.css`).
- **NextAuth v5 beta** — never import `@/lib/auth` in client components; use the helpers below.
- Add `export const dynamic = "force-dynamic";` to every dashboard page (data is per-request).
- **Never edit files via shell commands** (PowerShell corrupts UTF-8) — use Write/Edit tools only.

## Exemplar files (copy these patterns)

- Page with streaming sections: `src/app/dashboard/page.tsx`
- Async server card components: `src/app/dashboard/_components/overview-cards.tsx`
- KPI row + sparklines: `src/app/dashboard/_components/kpi-row.tsx`
- Client chart w/ URL-driven toggle: `src/app/dashboard/_components/revenue-chart-client.tsx`
- API route: `src/app/api/notifications/route.ts`, `src/app/api/auth/register/route.ts`

## Auth & RBAC

- Pages: `const ctx = await getOrgContext()` (`@/lib/auth/context`) → `{ user, org, role, project, memberships }`.
  - Gate a whole page: `await requirePermission("alerts.manage")`.
  - Gate UI affordances: `can(ctx.role, "reports.create")` from `@/lib/auth/rbac` — hide/disable buttons for viewers, but ALWAYS also enforce in the API.
- API routes: `const ctx = await getApiContext("data.export")` — throws typed errors.
- Wrap every route handler in `withErrorHandling` from `@/lib/api`; throw `badRequest()/forbidden()/notFound()`; zod errors auto-map to 422.
- Mutations: call `recordAudit({ orgId, actorId, action, ... })` from `@/lib/audit` (typed action union — extend it if needed).

## Data access

- All queries live in `src/lib/analytics/*` or inline `db.*` calls in route handlers/pages.
  Available services: overview, traffic, geo, devices, pages, activity, users, revenue, events, funnels, retention, reports (report-builder executor).
- Raw SQL: tagged `db.$queryRaw` only, `::int`/`::float` casts on aggregates, identifiers only from whitelists.
- Wrap expensive reads in `cached(key, ttlSec, fn)` from `@/lib/cache` — key must include projectId + range boundaries.
- Decimal columns: convert with `Number(x)` before passing to client components.

## Date range

- Parse: `resolveDateRange({ range: first(params.range), from: first(params.from), to: first(params.to) })` — gives `{ from, to, prevFrom, prevTo, days, granularity, label }`.
- The global picker already writes `?range=` — pages must just read it. Preserve unrelated params when writing URLs.

## UI composition

- Page skeleton: `PageHeader` + sections in `grid grid-cols-1 gap-4 lg:grid-cols-12`, each section an **async server component** wrapped in `<Suspense key={rangeKey} fallback={<ChartCardSkeleton/>}>`.
- Panels: `ChartCard` (`@/components/dashboard/chart-card`). KPIs: `KpiCard`. States: `EmptyState`, `ErrorState`. Skeletons: `@/components/dashboard/skeletons`.
- Each route gets its own `loading.tsx` (compose skeletons) and reuses the dashboard `error.tsx` boundary (already at `src/app/dashboard/error.tsx` — do NOT create per-route error files).
- Tables: shadcn `Table` inside `ChartCard` with `contentClassName="overflow-x-auto scrollbar-thin"`; numbers right-aligned `tabular-nums`; pagination via `Pagination` (`@/components/dashboard/pagination`) driven by `?page=`.
- Filters/sorting are **URL-driven** (server re-renders); build `<Link>`s or small client controls that `router.push` with merged params. Reset `page` when filters change.
- Formatting: ALWAYS use `@/lib/format` helpers (`formatCompact`, `formatCurrencyCompact`, `formatPercent`, `formatDuration`, `formatDelta`, `formatRelative`, `formatDateTime`, `formatNumber`). Never `toLocaleString` inline.
- Toasts: `toast.success/error` from `sonner` in client components after mutations; then `router.refresh()`.
- Icons: lucide, always `aria-hidden` + text label or `aria-label`.

## Charts (strict — these rules are validated)

- Use ONLY `TimeSeriesChart`, `CategoryBarChart`, `DonutChart`, `Sparkline` from `@/components/charts/*`. Do not hand-roll Recharts elsewhere.
- Categorical colors: assign palette slots **in order** (`seriesColor(i)`); >7 classes → fold into "Other" (`foldOther`).
- Magnitude comparisons (bars): single hue (default) — set `categorical` only when identity is the point.
- **Never two y-axes.** Different units = separate charts or a single-metric toggle.
- Legends render automatically for 2+ series; single series charts need none.

## Copy & polish

- Sentence case everywhere ("Traffic sources", not "Traffic Sources"). No lorem ipsum, no dead buttons.
- Every list/table needs an empty state with icon + explanation + action; every fetch failure path a retry.
- Buttons that submit show a loading state (`disabled` + `Loader2` spinner).

## File ownership (parallel work)

Create files ONLY inside your assigned routes/APIs. Do not modify shared files
(`globals.css`, shell components, lib/*, existing pages). If a shared change
seems necessary, report it instead of editing.
