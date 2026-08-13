# API reference

All endpoints live under `/api/*` as Next.js route handlers. JSON in/out unless
noted. Times are ISO 8601 UTC.

## Conventions

**Authentication** — session cookie (Auth.js JWT). Unauthenticated → `401`.

**Authorization** — endpoints declare a required permission; the caller's role
in the *active workspace* must meet it (see `src/lib/auth/rbac.ts`) → else `403`.
Resource IDs are always checked against the active org/project → foreign IDs `404`.

**Validation** — zod on every body/query. Failures return:

```json
{ "error": "Validation failed", "issues": [{ "path": "name", "message": "…" }] }   // 422
```

**Errors** — `{ "error": "message" }` with 400/401/403/404/429/500.
429 includes a `Retry-After` header.

**Date range** — analytics endpoints accept `range` (`today|yesterday|7d|30d|90d|this-month|last-month|this-year|custom`)
plus `from`/`to` (`YYYY-MM-DD`) when `custom`.

## Auth

| Method & path | Auth | Notes |
|---|---|---|
| `POST /api/auth/register` | public, rate-limited 5/10min/IP | `{name,email,password,orgName?}` → 201; creates user + workspace + project |
| `GET/POST /api/auth/[...nextauth]` | public | Auth.js (credentials sign-in, OAuth callbacks, session, sign-out) |
| `POST /api/auth/forgot-password` | public, rate-limited | `{email}` → always 200 (no account enumeration); emails a 1-hour single-use link |
| `POST /api/auth/reset-password` | public, rate-limited | `{token,password}` → 200; invalidates outstanding tokens |

## Workspace & shell

| Method & path | Permission | Notes |
|---|---|---|
| `POST /api/orgs/switch` | member | `{orgId}` → sets httpOnly active-workspace cookie |
| `PATCH /api/orgs` | `org.settings` | `{name}` |
| `DELETE /api/orgs` | `org.delete` | deletes workspace (cascades) |
| `GET /api/search?q=` | member | grouped results: users, reports, events, pages |
| `GET /api/notifications` | member | latest 20 + unread count |
| `PATCH /api/notifications` | member | `{markAllRead:true}` or `{id}` |
| `GET /api/health` | public | liveness/readiness: app, database, redis |

## Profile & members

| Method & path | Permission | Notes |
|---|---|---|
| `PATCH /api/profile` | member | `{name}` |
| `POST /api/profile/password` | member | `{currentPassword,password}` |
| `POST /api/members` | `members.manage` | invite `{email,role}`; existing users join immediately, unknown emails get an invite email |
| `PATCH /api/members` | `members.manage` | `{membershipId,role}`; owner-grant/last-owner/self-change guards |
| `DELETE /api/members?membershipId=` | `members.manage` | same guards |

## Analytics

| Method & path | Permission | Notes |
|---|---|---|
| `POST /api/analytics/query` | `analytics.view` | `{config:{metric,dimension,chart,filters},range}` → `{result:{rows,unit,…}}` (report builder) |
| `POST /api/funnels/query` | `analytics.view` | `{steps:[event…],range}` → `{stages:[{label,users,conversionPct,dropOffPct}]}` |
| `GET /api/users/export?…filters` | `data.export` | streams CSV (≤10k rows), audited |

## Events

| Method & path | Permission | Notes |
|---|---|---|
| `POST /api/events` | `events.manage` | `{name,description?,isConversion}` — snake_case name, unique per project |
| `DELETE /api/events/[id]` | `events.manage` | keeps historical event rows (definition unlink) |

## Reports

| Method & path | Permission | Notes |
|---|---|---|
| `GET /api/reports` | `analytics.view` | org's saved reports |
| `POST /api/reports` | `reports.create` | `{name,description?,config,schedule}` |
| `PATCH /api/reports/[id]` | `reports.manage` | partial update (rename, schedule, config) |
| `DELETE /api/reports/[id]` | `reports.manage` | |
| `POST /api/reports/[id]/duplicate` | `reports.create` | "<name> (copy)" |
| `GET /api/reports/[id]/export?range=` | `data.export` | runs the saved config, streams CSV, stamps `lastRunAt` |

## Alerts

| Method & path | Permission | Notes |
|---|---|---|
| `GET /api/alerts` | `analytics.view` | |
| `POST /api/alerts` | `alerts.manage` | `{name,metric,condition,threshold,frequency,channels,isActive}` |
| `PATCH /api/alerts/[id]` | `alerts.manage` | partial (incl. `{isActive}` toggle) |
| `DELETE /api/alerts/[id]` | `alerts.manage` | |

All mutating endpoints write an `AuditLog` row (action, actor, target, metadata, IP
where relevant) — browsable at **Settings → Audit log** by admins.
