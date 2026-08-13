import "server-only";
import { db } from "@/lib/db";
import { cached } from "@/lib/cache";
import type { DateRange } from "@/lib/date-range";
import type { BrowserRow, DeviceRow } from "@/lib/analytics/types";

export const DEVICE_LABELS: Record<string, string> = {
  DESKTOP: "Desktop",
  MOBILE: "Mobile",
  TABLET: "Tablet",
};

export async function getDeviceBreakdown(projectId: string, range: DateRange): Promise<DeviceRow[]> {
  return cached(`devices:${projectId}:${range.from.getTime()}:${range.to.getTime()}`, 120, async () => {
    const rows = await db.analyticsSession.groupBy({
      by: ["device"],
      where: { projectId, startedAt: { gte: range.from, lt: range.to } },
      _count: true,
      orderBy: { _count: { device: "desc" } },
    });
    const total = rows.reduce((s, r) => s + r._count, 0);
    return rows.map((r) => ({
      device: DEVICE_LABELS[r.device] ?? r.device,
      sessions: r._count,
      sharePct: total === 0 ? 0 : (r._count / total) * 100,
    }));
  });
}

export async function getBrowserBreakdown(projectId: string, range: DateRange): Promise<BrowserRow[]> {
  return cached(`browsers:${projectId}:${range.from.getTime()}:${range.to.getTime()}`, 120, async () => {
    const rows = await db.analyticsSession.groupBy({
      by: ["browser"],
      where: { projectId, startedAt: { gte: range.from, lt: range.to } },
      _count: true,
      orderBy: { _count: { browser: "desc" } },
    });
    const total = rows.reduce((s, r) => s + r._count, 0);
    return rows.map((r) => ({
      browser: r.browser,
      sessions: r._count,
      sharePct: total === 0 ? 0 : (r._count / total) * 100,
    }));
  });
}
