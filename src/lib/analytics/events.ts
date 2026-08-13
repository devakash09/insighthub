import "server-only";
import { db } from "@/lib/db";
import { cached } from "@/lib/cache";
import type { DateRange } from "@/lib/date-range";

export interface EventSummary {
  name: string;
  description: string | null;
  isConversion: boolean;
  count: number;
  uniqueUsers: number;
  /** Percent change vs previous period; null when previous is 0. */
  trendPct: number | null;
}

export async function listEventSummaries(projectId: string, range: DateRange): Promise<EventSummary[]> {
  return cached(`events:${projectId}:${range.from.getTime()}:${range.to.getTime()}`, 60, async () => {
    const [defs, current, previous] = await Promise.all([
      db.eventDefinition.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
      db.$queryRaw<{ name: string; count: number; unique_users: number }[]>`
        SELECT "name", COUNT(*)::int AS count, COUNT(DISTINCT "visitorId")::int AS unique_users
        FROM "Event"
        WHERE "projectId" = ${projectId} AND "occurredAt" >= ${range.from} AND "occurredAt" < ${range.to}
        GROUP BY 1`,
      db.$queryRaw<{ name: string; count: number }[]>`
        SELECT "name", COUNT(*)::int AS count
        FROM "Event"
        WHERE "projectId" = ${projectId} AND "occurredAt" >= ${range.prevFrom} AND "occurredAt" < ${range.prevTo}
        GROUP BY 1`,
    ]);

    const currentByName = new Map(current.map((r) => [r.name, r]));
    const prevByName = new Map(previous.map((r) => [r.name, r.count]));

    return defs
      .map((d) => {
        const cur = currentByName.get(d.name);
        const prev = prevByName.get(d.name) ?? 0;
        const count = cur?.count ?? 0;
        return {
          name: d.name,
          description: d.description,
          isConversion: d.isConversion,
          count,
          uniqueUsers: cur?.unique_users ?? 0,
          trendPct: prev === 0 ? (count === 0 ? 0 : null) : ((count - prev) / prev) * 100,
        };
      })
      .sort((a, b) => b.count - a.count);
  });
}

export async function getEventTrend(projectId: string, name: string, range: DateRange) {
  const unit = range.granularity === "hour" ? "hour" : range.granularity;
  return cached(`event-trend:${projectId}:${name}:${range.from.getTime()}:${range.to.getTime()}:${unit}`, 60, async () => {
    const rows = await db.$queryRaw<{ bucket: Date; count: number; unique_users: number }[]>`
      SELECT date_trunc(${unit}, "occurredAt") AS bucket,
             COUNT(*)::int AS count,
             COUNT(DISTINCT "visitorId")::int AS unique_users
      FROM "Event"
      WHERE "projectId" = ${projectId} AND "name" = ${name}
        AND "occurredAt" >= ${range.from} AND "occurredAt" < ${range.to}
      GROUP BY 1 ORDER BY 1`;
    return rows.map((r) => ({ bucket: r.bucket.toISOString(), count: r.count, uniqueUsers: r.unique_users }));
  });
}

export async function getEventDetail(projectId: string, name: string, range: DateRange) {
  const definition = await db.eventDefinition.findUnique({
    where: { projectId_name: { projectId, name } },
  });
  if (!definition) return null;

  const [countRow, activeRow, trend, recent, byDevice, bySource] = await Promise.all([
    db.$queryRaw<{ count: number; unique_users: number }[]>`
      SELECT COUNT(*)::int AS count, COUNT(DISTINCT "visitorId")::int AS unique_users
      FROM "Event"
      WHERE "projectId" = ${projectId} AND "name" = ${name}
        AND "occurredAt" >= ${range.from} AND "occurredAt" < ${range.to}`,
    db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT "visitorId")::int AS count FROM "AnalyticsSession"
      WHERE "projectId" = ${projectId} AND "startedAt" >= ${range.from} AND "startedAt" < ${range.to}`,
    getEventTrend(projectId, name, range),
    db.event.findMany({
      where: { projectId, name, occurredAt: { gte: range.from, lt: range.to } },
      orderBy: { occurredAt: "desc" },
      take: 25,
      include: { visitor: { select: { id: true, name: true, email: true, country: true } } },
    }),
    db.$queryRaw<{ device: string; count: number }[]>`
      SELECT s."device"::text AS device, COUNT(*)::int AS count
      FROM "Event" e JOIN "AnalyticsSession" s ON s.id = e."sessionId"
      WHERE e."projectId" = ${projectId} AND e."name" = ${name}
        AND e."occurredAt" >= ${range.from} AND e."occurredAt" < ${range.to}
      GROUP BY 1 ORDER BY count DESC`,
    db.$queryRaw<{ source: string; count: number }[]>`
      SELECT s."source"::text AS source, COUNT(*)::int AS count
      FROM "Event" e JOIN "AnalyticsSession" s ON s.id = e."sessionId"
      WHERE e."projectId" = ${projectId} AND e."name" = ${name}
        AND e."occurredAt" >= ${range.from} AND e."occurredAt" < ${range.to}
      GROUP BY 1 ORDER BY count DESC`,
  ]);

  const count = countRow[0]?.count ?? 0;
  const uniqueUsers = countRow[0]?.unique_users ?? 0;
  const activeUsers = activeRow[0]?.count ?? 0;

  return {
    definition,
    count,
    uniqueUsers,
    /** Share of active users in the window who fired this event. */
    reachPct: activeUsers === 0 ? 0 : (uniqueUsers / activeUsers) * 100,
    trend,
    recent,
    byDevice,
    bySource,
  };
}
