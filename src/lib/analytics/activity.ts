import "server-only";
import { db } from "@/lib/db";
import type { ActivityItem } from "@/lib/analytics/types";

/** Most recent non-pageview events for the overview activity feed. */
export async function getRecentActivity(projectId: string, limit = 12): Promise<ActivityItem[]> {
  const events = await db.event.findMany({
    where: { projectId, name: { not: "page_view" } },
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: { visitor: { select: { id: true, name: true, country: true } } },
  });

  return events.map((e) => ({
    id: e.id,
    name: e.name,
    occurredAt: e.occurredAt.toISOString(),
    visitorId: e.visitor.id,
    visitorName: e.visitor.name,
    country: e.visitor.country,
    metadata: e.metadata,
  }));
}
