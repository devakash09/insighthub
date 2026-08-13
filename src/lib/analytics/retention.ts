import "server-only";
import { db } from "@/lib/db";
import { cached } from "@/lib/cache";
import type { CohortRow } from "@/lib/analytics/types";

/**
 * Weekly cohort retention: visitors grouped by first-seen week; retention at
 * offset W = share of the cohort with a session in week (cohort + W).
 */
export async function getWeeklyCohorts(projectId: string, weeks = 8): Promise<CohortRow[]> {
  return cached(`cohorts:${projectId}:${weeks}`, 300, async () => {
    const since = new Date(Date.now() - weeks * 7 * 86_400_000);

    const rows = await db.$queryRaw<
      { cohort: Date; week_offset: number; users: number }[]
    >`
      WITH cohorts AS (
        SELECT id, date_trunc('week', "firstSeenAt") AS cohort
        FROM "Visitor"
        WHERE "projectId" = ${projectId} AND "firstSeenAt" >= ${since}
      ),
      weekly_activity AS (
        SELECT DISTINCT "visitorId", date_trunc('week', "startedAt") AS wk
        FROM "AnalyticsSession"
        WHERE "projectId" = ${projectId} AND "startedAt" >= ${since}
      )
      SELECT c.cohort,
             (EXTRACT(EPOCH FROM (a.wk - c.cohort)) / 604800)::int AS week_offset,
             COUNT(DISTINCT c.id)::int AS users
      FROM cohorts c
      JOIN weekly_activity a ON a."visitorId" = c.id AND a.wk >= c.cohort
      GROUP BY 1, 2
      ORDER BY 1, 2`;

    const sizes = await db.$queryRaw<{ cohort: Date; size: number }[]>`
      SELECT date_trunc('week', "firstSeenAt") AS cohort, COUNT(*)::int AS size
      FROM "Visitor"
      WHERE "projectId" = ${projectId} AND "firstSeenAt" >= ${since}
      GROUP BY 1 ORDER BY 1`;

    const nowWeekMs = Date.now();
    const byCohort = new Map<string, CohortRow>();
    for (const s of sizes) {
      const iso = s.cohort.toISOString();
      const elapsedWeeks = Math.floor((nowWeekMs - s.cohort.getTime()) / (7 * 86_400_000));
      byCohort.set(iso, {
        cohortStart: iso,
        size: s.size,
        // Future offsets (not yet observable) are null so the heatmap greys them.
        retention: Array.from({ length: weeks }, (_, i) => (i <= elapsedWeeks ? 0 : null)),
      });
    }
    for (const r of rows) {
      const cohort = byCohort.get(r.cohort.toISOString());
      if (!cohort || r.week_offset < 0 || r.week_offset >= weeks) continue;
      if (cohort.retention[r.week_offset] !== null) {
        cohort.retention[r.week_offset] = cohort.size === 0 ? 0 : Math.round((r.users / cohort.size) * 1000) / 10;
      }
    }
    return [...byCohort.values()].sort((a, b) => a.cohortStart.localeCompare(b.cohortStart));
  });
}
