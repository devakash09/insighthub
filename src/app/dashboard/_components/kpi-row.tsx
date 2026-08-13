import { getOverviewKpis, getOverviewTimeseries } from "@/lib/analytics/overview";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCompact, formatCurrencyCompact, formatDuration, formatPercent } from "@/lib/format";
import type { DateRange } from "@/lib/date-range";
import type { TimeseriesPoint } from "@/lib/analytics/types";

/** Downsample a timeseries into a ~12 point sparkline. */
function spark(points: TimeseriesPoint[], pick: (p: TimeseriesPoint) => number): number[] {
  if (points.length === 0) return [];
  const step = Math.max(1, Math.floor(points.length / 12));
  const out: number[] = [];
  for (let i = 0; i < points.length; i += step) {
    const chunk = points.slice(i, i + step);
    out.push(chunk.reduce((s, p) => s + pick(p), 0));
  }
  return out;
}

export async function KpiRow({ projectId, range }: { projectId: string; range: DateRange }) {
  const [kpis, series] = await Promise.all([
    getOverviewKpis(projectId, range),
    getOverviewTimeseries(projectId, range),
  ]);

  // Sparkline for "Total users": cumulative curve of new users within range.
  const cumulativeUsers = series.reduce<number[]>(
    (acc, p) => [...acc, (acc[acc.length - 1] ?? 0) + p.newUsers],
    [],
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        label="Total users"
        value={formatCompact(kpis.totalUsers.current)}
        changePct={kpis.totalUsers.changePct}
        spark={cumulativeUsers}
      />
      <KpiCard
        label="Active users"
        value={formatCompact(kpis.activeUsers.current)}
        changePct={kpis.activeUsers.changePct}
        spark={spark(series, (p) => p.activeUsers)}
      />
      <KpiCard
        label="Sessions"
        value={formatCompact(kpis.sessions.current)}
        changePct={kpis.sessions.changePct}
        spark={spark(series, (p) => p.sessions)}
      />
      <KpiCard
        label="Conversion rate"
        value={formatPercent(kpis.conversionRate.current)}
        changePct={kpis.conversionRate.changePct}
        spark={series.map((p) => (p.sessions === 0 ? 0 : (p.conversions / p.sessions) * 100))}
      />
      <KpiCard
        label="Revenue"
        value={formatCurrencyCompact(kpis.revenue.current)}
        changePct={kpis.revenue.changePct}
        spark={spark(series, (p) => p.revenue)}
      />
      <KpiCard
        label="Avg. session duration"
        value={formatDuration(kpis.avgSessionDuration.current)}
        changePct={kpis.avgSessionDuration.changePct}
      />
    </div>
  );
}
