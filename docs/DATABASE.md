# Database

PostgreSQL via Prisma. Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma).

## Entity-relationship overview

```
User ─┬─< Account / Session / VerificationToken / PasswordResetToken   (Auth.js)
      ├─< Membership >── Organization ──< Project
      ├─< Notification            │            │
      └─< AuditLog >──────────────┘            │
                                               │
Organization ──< SavedReport / Dashboard / Alert
                                               │
Project ──< EventDefinition ──< Event          │
        ├─< Visitor ─┬─< AnalyticsSession ─< PageView
        │            ├─< Event                 │
        │            └─< RevenueTransaction >── Product
        └─< PageView / Event / RevenueTransaction / AnalyticsSession (direct FKs)
```

### Tenancy & access

| Model | Purpose |
|---|---|
| `User` | Account (credentials hash or OAuth via `Account`) |
| `Organization` | Workspace; unique `slug`, plan label |
| `Membership` | User↔org with `Role` (OWNER/ADMIN/ANALYST/VIEWER); unique `(userId, orgId)` |
| `Project` | A tracked website/app inside an org; all analytics rows hang off it |

### Analytics (high volume)

| Model | Grain | Notes |
|---|---|---|
| `Visitor` | tracked end-user | denormalized `sessionsCount`, `totalRevenue`, `status` for fast tables |
| `AnalyticsSession` | one visit | device/browser/geo/source dimensions; `converted` flag |
| `PageView` | one page render | `durationSec`, `bounced` |
| `EventDefinition` | event type | unique `(projectId, name)`, `isConversion` |
| `Event` | one occurrence | optional `sessionId`/`definitionId` (SetNull on delete), JSON `metadata` |
| `Product` | sellable plan/add-on | |
| `RevenueTransaction` | one charge | `status` (succeeded/pending/refunded/failed), `type` (one-time/subscription/renewal), `segment` |

### Workspace resources

`SavedReport` (config JSON + `schedule`), `Dashboard` (layout JSON), `Alert`
(metric/condition/threshold/frequency/channels), `Notification` (per-user),
`AuditLog` (org-scoped action trail).

## Indexing strategy

Every high-volume table carries composite indexes that match the dashboard's
access patterns — always `projectId` first, then the time column, plus the
dimension used by group-bys:

- `AnalyticsSession`: `(projectId, startedAt)`, `(projectId, source, startedAt)`,
  `(projectId, country, startedAt)`, `(projectId, device, startedAt)`, `(visitorId, startedAt)`
- `PageView`: `(projectId, occurredAt)`, `(projectId, path, occurredAt)`, `(sessionId)`
- `Event`: `(projectId, name, occurredAt)`, `(projectId, occurredAt)`, `(visitorId, occurredAt)`
- `RevenueTransaction`: `(projectId, occurredAt)`, `(projectId, status, occurredAt)`
- `Visitor`: `(projectId, lastSeenAt)`, `(projectId, firstSeenAt)`, `(projectId, country)`, `(projectId, email)`
- Resource tables index their list orderings (`(orgId, updatedAt)`, `(userId, createdAt)`, `(orgId, createdAt)`).

Deletion semantics: org/project/visitor deletes **cascade** through their
children; events survive definition deletion (`SetNull`) so history is never
silently destroyed; audit logs keep a null actor when a user is removed.

## Migrations & seed

```bash
npm run db:migrate   # dev: create + apply migration from schema changes
npm run db:deploy    # prod/CI: apply committed migrations only
npm run db:seed      # deterministic demo dataset (faker seeded)
```

The seed builds ~95k rows across two workspaces: 180 days of visitors with
growth-weighted cohort arrival, weekly retention decay (≈46% week-1 retention
decaying 13%/week), business-hours session times, a signup→product_view→
checkout→purchase funnel, and monthly subscription renewals with churn — so
every chart (including cohorts and funnels) looks organic out of the box.
