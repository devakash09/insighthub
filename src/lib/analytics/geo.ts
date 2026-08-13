import "server-only";
import { db } from "@/lib/db";
import { cached } from "@/lib/cache";
import type { DateRange } from "@/lib/date-range";
import type { GeoRow, SubGeoRow } from "@/lib/analytics/types";

export async function getGeoBreakdown(projectId: string, range: DateRange, limit = 12): Promise<GeoRow[]> {
  return cached(`geo:${projectId}:${range.from.getTime()}:${range.to.getTime()}:${limit}`, 120, async () => {
    const [rows, revenueRows] = await Promise.all([
      db.$queryRaw<{ country: string; sessions: number; visitors: number }[]>`
        SELECT "country", COUNT(*)::int AS sessions, COUNT(DISTINCT "visitorId")::int AS visitors
        FROM "AnalyticsSession"
        WHERE "projectId" = ${projectId} AND "startedAt" >= ${range.from} AND "startedAt" < ${range.to}
        GROUP BY 1 ORDER BY sessions DESC`,
      db.$queryRaw<{ country: string; revenue: number }[]>`
        SELECT "country", COALESCE(SUM("amount"), 0)::float AS revenue
        FROM "RevenueTransaction"
        WHERE "projectId" = ${projectId} AND "occurredAt" >= ${range.from} AND "occurredAt" < ${range.to}
          AND status = 'SUCCEEDED'
        GROUP BY 1`,
    ]);

    const revenueByCountry = new Map(revenueRows.map((r) => [r.country, r.revenue]));
    const total = rows.reduce((s, r) => s + r.sessions, 0);
    return rows.slice(0, limit).map((r) => ({
      country: r.country,
      sessions: r.sessions,
      visitors: r.visitors,
      revenue: Math.round((revenueByCountry.get(r.country) ?? 0) * 100) / 100,
      sharePct: total === 0 ? 0 : (r.sessions / total) * 100,
    }));
  });
}

export async function getTopRegions(projectId: string, range: DateRange, limit = 8): Promise<SubGeoRow[]> {
  const rows = await db.$queryRaw<{ region: string; country: string; sessions: number }[]>`
    SELECT COALESCE("region", 'Unknown') AS region, "country", COUNT(*)::int AS sessions
    FROM "AnalyticsSession"
    WHERE "projectId" = ${projectId} AND "startedAt" >= ${range.from} AND "startedAt" < ${range.to}
    GROUP BY 1, 2 ORDER BY sessions DESC LIMIT ${limit}`;
  return rows.map((r) => ({ name: r.region, country: r.country, sessions: r.sessions }));
}

export async function getTopCities(projectId: string, range: DateRange, limit = 8): Promise<SubGeoRow[]> {
  const rows = await db.$queryRaw<{ city: string; country: string; sessions: number }[]>`
    SELECT COALESCE("city", 'Unknown') AS city, "country", COUNT(*)::int AS sessions
    FROM "AnalyticsSession"
    WHERE "projectId" = ${projectId} AND "startedAt" >= ${range.from} AND "startedAt" < ${range.to}
    GROUP BY 1, 2 ORDER BY sessions DESC LIMIT ${limit}`;
  return rows.map((r) => ({ name: r.city, country: r.country, sessions: r.sessions }));
}
