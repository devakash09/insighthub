import "server-only";
import { db } from "@/lib/db";
import { cached } from "@/lib/cache";
import type { DateRange } from "@/lib/date-range";
import type { TopPageRow } from "@/lib/analytics/types";

export async function getTopPages(projectId: string, range: DateRange, limit = 10): Promise<TopPageRow[]> {
  return cached(`pages:${projectId}:${range.from.getTime()}:${range.to.getTime()}:${limit}`, 60, async () => {
    const rows = await db.$queryRaw<
      {
        path: string;
        title: string | null;
        views: number;
        visitors: number;
        avg_time: number;
        bounce_rate: number;
        conv_rate: number;
      }[]
    >`
      SELECT p."path",
             MAX(p."title") AS title,
             COUNT(*)::int AS views,
             COUNT(DISTINCT p."visitorId")::int AS visitors,
             COALESCE(AVG(p."durationSec"), 0)::float AS avg_time,
             COALESCE(AVG(CASE WHEN p."bounced" THEN 1.0 ELSE 0.0 END), 0)::float AS bounce_rate,
             COALESCE(AVG(CASE WHEN s."converted" THEN 1.0 ELSE 0.0 END), 0)::float AS conv_rate
      FROM "PageView" p
      JOIN "AnalyticsSession" s ON s.id = p."sessionId"
      WHERE p."projectId" = ${projectId} AND p."occurredAt" >= ${range.from} AND p."occurredAt" < ${range.to}
      GROUP BY p."path"
      ORDER BY views DESC
      LIMIT ${limit}`;

    return rows.map((r) => ({
      path: r.path,
      title: r.title,
      views: r.views,
      visitors: r.visitors,
      avgTimeSec: r.avg_time,
      bounceRatePct: r.bounce_rate * 100,
      conversionRatePct: r.conv_rate * 100,
    }));
  });
}
