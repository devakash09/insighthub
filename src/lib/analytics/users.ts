import "server-only";
import { Prisma, type DeviceType, type TrafficSource, type VisitorStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { cached } from "@/lib/cache";
import { pctChange } from "@/lib/format";
import type { DateRange } from "@/lib/date-range";
import type { KpiValue } from "@/lib/analytics/types";

export interface UserKpis {
  totalUsers: KpiValue;
  newUsers: KpiValue;
  returningUsers: KpiValue;
  activeUsers: KpiValue;
  retentionRatePct: KpiValue;
}

function kpi(current: number, previous: number): KpiValue {
  return { current, previous, changePct: pctChange(current, previous) };
}

async function userWindow(projectId: string, from: Date, to: Date) {
  const [total, newUsers, activeRows, returningRows] = await Promise.all([
    db.visitor.count({ where: { projectId, firstSeenAt: { lte: to } } }),
    db.visitor.count({ where: { projectId, firstSeenAt: { gte: from, lt: to } } }),
    db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT "visitorId")::int AS count FROM "AnalyticsSession"
      WHERE "projectId" = ${projectId} AND "startedAt" >= ${from} AND "startedAt" < ${to}`,
    db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT s."visitorId")::int AS count
      FROM "AnalyticsSession" s JOIN "Visitor" v ON v.id = s."visitorId"
      WHERE s."projectId" = ${projectId} AND s."startedAt" >= ${from} AND s."startedAt" < ${to}
        AND v."firstSeenAt" < ${from}`,
  ]);
  const active = activeRows[0]?.count ?? 0;
  const returning = returningRows[0]?.count ?? 0;
  return {
    total,
    newUsers,
    active,
    returning,
    // Share of previously-known users who came back during this window.
    retention: active === 0 ? 0 : (returning / active) * 100,
  };
}

export async function getUserKpis(projectId: string, range: DateRange): Promise<UserKpis> {
  return cached(`user-kpis:${projectId}:${range.from.getTime()}:${range.to.getTime()}`, 60, async () => {
    const [cur, prev] = await Promise.all([
      userWindow(projectId, range.from, range.to),
      userWindow(projectId, range.prevFrom, range.prevTo),
    ]);
    return {
      totalUsers: kpi(cur.total, prev.total),
      newUsers: kpi(cur.newUsers, prev.newUsers),
      returningUsers: kpi(cur.returning, prev.returning),
      activeUsers: kpi(cur.active, prev.active),
      retentionRatePct: kpi(cur.retention, prev.retention),
    };
  });
}

export interface VisitorListParams {
  page: number;
  pageSize: number;
  search?: string;
  sort?: "lastSeenAt" | "firstSeenAt" | "sessionsCount" | "totalRevenue" | "name";
  dir?: "asc" | "desc";
  country?: string;
  device?: DeviceType;
  source?: TrafficSource;
  status?: VisitorStatus;
}

export async function listVisitors(projectId: string, params: VisitorListParams) {
  const where: Prisma.VisitorWhereInput = {
    projectId,
    ...(params.country ? { country: params.country } : {}),
    ...(params.device ? { device: params.device } : {}),
    ...(params.source ? { source: params.source } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" } },
            { email: { contains: params.search, mode: "insensitive" } },
            { id: { contains: params.search } },
          ],
        }
      : {}),
  };

  const orderBy = { [params.sort ?? "lastSeenAt"]: params.dir ?? "desc" };
  const [rows, total] = await Promise.all([
    db.visitor.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    db.visitor.count({ where }),
  ]);

  return {
    rows: rows.map((v) => ({ ...v, totalRevenue: Number(v.totalRevenue) })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getVisitorDetail(projectId: string, visitorId: string) {
  const visitor = await db.visitor.findFirst({ where: { id: visitorId, projectId } });
  if (!visitor) return null;

  const [sessions, events, transactions, eventCounts] = await Promise.all([
    db.analyticsSession.findMany({ where: { visitorId }, orderBy: { startedAt: "desc" }, take: 20 }),
    db.event.findMany({
      where: { visitorId, name: { not: "page_view" } },
      orderBy: { occurredAt: "desc" },
      take: 30,
    }),
    db.revenueTransaction.findMany({
      where: { visitorId },
      orderBy: { occurredAt: "desc" },
      take: 20,
      include: { product: { select: { name: true } } },
    }),
    db.event.groupBy({ by: ["name"], where: { visitorId }, _count: true, orderBy: { _count: { name: "desc" } } }),
  ]);

  const totalPageViews = await db.pageView.count({ where: { visitorId } });
  const avgDuration =
    sessions.length === 0 ? 0 : sessions.reduce((s, x) => s + x.durationSec, 0) / sessions.length;

  return {
    visitor: { ...visitor, totalRevenue: Number(visitor.totalRevenue) },
    sessions,
    events,
    transactions: transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
    eventCounts: eventCounts.map((e) => ({ name: e.name, count: e._count })),
    stats: { totalPageViews, avgDurationSec: avgDuration },
  };
}

/** Distinct countries present in the project (for the filter dropdown). */
export async function getVisitorCountries(projectId: string): Promise<string[]> {
  return cached(`visitor-countries:${projectId}`, 600, async () => {
    const rows = await db.visitor.groupBy({
      by: ["country"],
      where: { projectId },
      _count: true,
      orderBy: { _count: { country: "desc" } },
    });
    return rows.map((r) => r.country);
  });
}
