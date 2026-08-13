import "server-only";
import { db } from "@/lib/db";
import { cached } from "@/lib/cache";
import type { DateRange } from "@/lib/date-range";
import type { SourceBreakdown } from "@/lib/analytics/types";

export const SOURCE_LABELS: Record<string, string> = {
  ORGANIC: "Organic Search",
  DIRECT: "Direct",
  SOCIAL: "Social",
  REFERRAL: "Referral",
  PAID: "Paid Ads",
  EMAIL: "Email",
};

export async function getTrafficSources(projectId: string, range: DateRange): Promise<SourceBreakdown[]> {
  return cached(`traffic:${projectId}:${range.from.getTime()}:${range.to.getTime()}`, 60, async () => {
    const rows = await db.$queryRaw<
      { source: string; sessions: number; visitors: number; conversions: number }[]
    >`
      SELECT "source"::text AS source,
             COUNT(*)::int AS sessions,
             COUNT(DISTINCT "visitorId")::int AS visitors,
             COUNT(*) FILTER (WHERE "converted")::int AS conversions
      FROM "AnalyticsSession"
      WHERE "projectId" = ${projectId} AND "startedAt" >= ${range.from} AND "startedAt" < ${range.to}
      GROUP BY 1
      ORDER BY sessions DESC`;

    const total = rows.reduce((s, r) => s + r.sessions, 0);
    return rows.map((r) => ({
      source: SOURCE_LABELS[r.source] ?? r.source,
      sessions: r.sessions,
      visitors: r.visitors,
      conversions: r.conversions,
      sharePct: total === 0 ? 0 : (r.sessions / total) * 100,
    }));
  });
}

/** Per-bucket sessions per source, for the traffic page's stacked/line view. */
export async function getTrafficTimeseries(projectId: string, range: DateRange) {
  const unit = range.granularity === "hour" ? "hour" : range.granularity;
  return cached(`traffic-ts:${projectId}:${range.from.getTime()}:${range.to.getTime()}:${unit}`, 60, async () => {
    const rows = await db.$queryRaw<{ bucket: Date; source: string; sessions: number }[]>`
      SELECT date_trunc(${unit}, "startedAt") AS bucket, "source"::text AS source, COUNT(*)::int AS sessions
      FROM "AnalyticsSession"
      WHERE "projectId" = ${projectId} AND "startedAt" >= ${range.from} AND "startedAt" < ${range.to}
      GROUP BY 1, 2
      ORDER BY 1`;

    const buckets = new Map<string, Record<string, number | string>>();
    for (const r of rows) {
      const iso = r.bucket.toISOString();
      const entry = buckets.get(iso) ?? { bucket: iso };
      entry[SOURCE_LABELS[r.source] ?? r.source] = r.sessions;
      buckets.set(iso, entry);
    }
    return [...buckets.values()];
  });
}
