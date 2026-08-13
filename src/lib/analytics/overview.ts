import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cached } from "@/lib/cache";
import { pctChange } from "@/lib/format";
import type { DateRange, Granularity } from "@/lib/date-range";
import type { KpiValue, OverviewKpis, TimeseriesPoint } from "@/lib/analytics/types";

function kpi(current: number, previous: number): KpiValue {
  return { current, previous, changePct: pctChange(current, previous) };
}

async function windowAggregates(projectId: string, from: Date, to: Date) {
  const [cumulativeUsers, activeUsers, sessionAgg, convertedCount, revenueAgg] = await Promise.all([
    db.visitor.count({ where: { projectId, firstSeenAt: { lte: to } } }),
    db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT "visitorId")::int AS count
      FROM "AnalyticsSession"
      WHERE "projectId" = ${projectId} AND "startedAt" >= ${from} AND "startedAt" < ${to}`,
    db.analyticsSession.aggregate({
      where: { projectId, startedAt: { gte: from, lt: to } },
      _count: true,
      _avg: { durationSec: true },
    }),
    db.analyticsSession.count({ where: { projectId, startedAt: { gte: from, lt: to }, converted: true } }),
    db.revenueTransaction.aggregate({
      where: { projectId, occurredAt: { gte: from, lt: to }, status: "SUCCEEDED" },
      _sum: { amount: true },
    }),
  ]);

  const sessions = sessionAgg._count;
  return {
    cumulativeUsers,
    activeUsers: activeUsers[0]?.count ?? 0,
    sessions,
    conversionRate: sessions === 0 ? 0 : (convertedCount / sessions) * 100,
    revenue: Number(revenueAgg._sum.amount ?? 0),
    avgDuration: sessionAgg._avg.durationSec ?? 0,
  };
}

export async function getOverviewKpis(projectId: string, range: DateRange): Promise<OverviewKpis> {
  return cached(`kpis:${projectId}:${range.from.getTime()}:${range.to.getTime()}`, 60, async () => {
    const [cur, prev] = await Promise.all([
      windowAggregates(projectId, range.from, range.to),
      windowAggregates(projectId, range.prevFrom, range.prevTo),
    ]);
    return {
      totalUsers: kpi(cur.cumulativeUsers, prev.cumulativeUsers),
      activeUsers: kpi(cur.activeUsers, prev.activeUsers),
      sessions: kpi(cur.sessions, prev.sessions),
      conversionRate: kpi(cur.conversionRate, prev.conversionRate),
      revenue: kpi(cur.revenue, prev.revenue),
      avgSessionDuration: kpi(cur.avgDuration, prev.avgDuration),
    };
  });
}

const GRANULARITY_UNIT: Record<Granularity, string> = {
  hour: "hour",
  day: "day",
  week: "week",
  month: "month",
};

/**
 * Merged per-bucket timeseries over sessions, page views, new users, and
 * revenue. Buckets with no activity are zero-filled so charts render
 * continuous lines.
 */
export async function getOverviewTimeseries(
  projectId: string,
  range: DateRange,
  granularity: Granularity = range.granularity,
): Promise<TimeseriesPoint[]> {
  const unit = GRANULARITY_UNIT[granularity];
  const key = `ts:${projectId}:${range.from.getTime()}:${range.to.getTime()}:${unit}`;

  return cached(key, 60, async () => {
    const [sessionRows, pageViewRows, newUserRows, revenueRows] = await Promise.all([
      db.$queryRaw<
        { bucket: Date; sessions: number; active: number; returning: number; conversions: number }[]
      >(Prisma.sql`
        SELECT date_trunc(${unit}, "startedAt") AS bucket,
               COUNT(*)::int AS sessions,
               COUNT(DISTINCT "visitorId")::int AS active,
               COUNT(DISTINCT "visitorId") FILTER (WHERE s."startedAt" > v."firstSeenAt" + interval '1 day')::int AS returning,
               COUNT(*) FILTER (WHERE s."converted")::int AS conversions
        FROM "AnalyticsSession" s
        JOIN "Visitor" v ON v.id = s."visitorId"
        WHERE s."projectId" = ${projectId} AND s."startedAt" >= ${range.from} AND s."startedAt" < ${range.to}
        GROUP BY 1 ORDER BY 1`),
      db.$queryRaw<{ bucket: Date; views: number }[]>(Prisma.sql`
        SELECT date_trunc(${unit}, "occurredAt") AS bucket, COUNT(*)::int AS views
        FROM "PageView"
        WHERE "projectId" = ${projectId} AND "occurredAt" >= ${range.from} AND "occurredAt" < ${range.to}
        GROUP BY 1 ORDER BY 1`),
      db.$queryRaw<{ bucket: Date; new_users: number }[]>(Prisma.sql`
        SELECT date_trunc(${unit}, "firstSeenAt") AS bucket, COUNT(*)::int AS new_users
        FROM "Visitor"
        WHERE "projectId" = ${projectId} AND "firstSeenAt" >= ${range.from} AND "firstSeenAt" < ${range.to}
        GROUP BY 1 ORDER BY 1`),
      db.$queryRaw<{ bucket: Date; revenue: number }[]>(Prisma.sql`
        SELECT date_trunc(${unit}, "occurredAt") AS bucket, COALESCE(SUM("amount"), 0)::float AS revenue
        FROM "RevenueTransaction"
        WHERE "projectId" = ${projectId} AND "occurredAt" >= ${range.from} AND "occurredAt" < ${range.to}
          AND status = 'SUCCEEDED'
        GROUP BY 1 ORDER BY 1`),
    ]);

    const points = new Map<string, TimeseriesPoint>();

    // Zero-fill buckets in UTC — Postgres date_trunc runs in the session
    // timezone (UTC), so local-time alignment would interleave phantom
    // zero-buckets between the real ones.
    const cursor = truncateUtc(range.from, granularity);
    while (cursor < range.to) {
      const iso = cursor.toISOString();
      if (!points.has(iso)) {
        points.set(iso, {
          bucket: iso, sessions: 0, pageViews: 0, newUsers: 0, activeUsers: 0, returningUsers: 0, revenue: 0, conversions: 0,
        });
      }
      if (granularity === "hour") cursor.setUTCHours(cursor.getUTCHours() + 1);
      else if (granularity === "day") cursor.setUTCDate(cursor.getUTCDate() + 1);
      else if (granularity === "week") cursor.setUTCDate(cursor.getUTCDate() + 7);
      else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    const get = (bucket: Date) => {
      const iso = bucket.toISOString();
      let p = points.get(iso);
      if (!p) {
        p = { bucket: iso, sessions: 0, pageViews: 0, newUsers: 0, activeUsers: 0, returningUsers: 0, revenue: 0, conversions: 0 };
        points.set(iso, p);
      }
      return p;
    };

    for (const r of sessionRows) {
      const p = get(r.bucket);
      p.sessions = r.sessions;
      p.activeUsers = r.active;
      p.returningUsers = r.returning;
      p.conversions = r.conversions;
    }
    for (const r of pageViewRows) get(r.bucket).pageViews = r.views;
    for (const r of newUserRows) get(r.bucket).newUsers = r.new_users;
    for (const r of revenueRows) get(r.bucket).revenue = Math.round(r.revenue * 100) / 100;

    return [...points.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
  });
}

function truncateUtc(d: Date, granularity: Granularity): Date {
  const x = new Date(d);
  if (granularity === "hour") {
    x.setUTCMinutes(0, 0, 0);
  } else if (granularity === "day") {
    x.setUTCHours(0, 0, 0, 0);
  } else if (granularity === "week") {
    x.setUTCHours(0, 0, 0, 0);
    const day = (x.getUTCDay() + 6) % 7; // Monday-start weeks, matching Postgres
    x.setUTCDate(x.getUTCDate() - day);
  } else {
    x.setUTCHours(0, 0, 0, 0);
    x.setUTCDate(1);
  }
  return x;
}
