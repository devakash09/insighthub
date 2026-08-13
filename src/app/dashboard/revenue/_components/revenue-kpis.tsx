import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { getRevenueKpis, getRevenueTimeseries } from "@/lib/analytics/revenue";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCompact, formatCurrency, formatCurrencyCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/lib/date-range";

/** Downsample a value series into a ~12 point sparkline. */
function spark(values: number[]): number[] {
  if (values.length === 0) return [];
  const step = Math.max(1, Math.floor(values.length / 12));
  const out: number[] = [];
  for (let i = 0; i < values.length; i += step) {
    out.push(values.slice(i, i + step).reduce((s, v) => s + v, 0));
  }
  return out;
}

export async function RevenueKpis({ projectId, range }: { projectId: string; range: DateRange }) {
  const [kpis, series] = await Promise.all([
    getRevenueKpis(projectId, range),
    getRevenueTimeseries(projectId, range),
  ]);

  const growth = kpis.growthRatePct;
  const direction = growth === null ? null : growth > 0 ? "up" : growth < 0 ? "down" : "flat";
  const GrowthIcon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total revenue"
          value={formatCurrencyCompact(kpis.totalRevenue.current)}
          changePct={kpis.totalRevenue.changePct}
          spark={spark(series.map((p) => p.gross))}
        />
        <KpiCard
          label="MRR"
          value={formatCurrencyCompact(kpis.mrr.current)}
          changePct={kpis.mrr.changePct}
        />
        <KpiCard
          label="ARR"
          value={formatCurrencyCompact(kpis.arr.current)}
          changePct={kpis.arr.changePct}
        />
        <KpiCard
          label="ARPU"
          value={formatCurrency(kpis.arpu.current, { cents: true })}
          changePct={kpis.arpu.changePct}
        />
        <KpiCard
          label="Transactions"
          value={formatCompact(kpis.transactions.current)}
          changePct={kpis.transactions.changePct}
        />
        <KpiCard
          label="Refunds"
          value={formatCurrencyCompact(kpis.refunds.current)}
          changePct={kpis.refunds.changePct}
          upIsGood={false}
        />
      </div>
      {direction !== null && (
        <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <GrowthIcon
            aria-hidden
            className={cn(
              "h-3.5 w-3.5",
              direction === "up" && "text-success",
              direction === "down" && "text-destructive",
            )}
          />
          {direction === "flat" ? (
            <span>Revenue is flat vs the previous period</span>
          ) : (
            <span>
              Revenue is {direction}{" "}
              <span
                className={cn(
                  "font-medium tabular-nums",
                  direction === "up" ? "text-success" : "text-destructive",
                )}
              >
                {formatPercent(Math.abs(growth ?? 0), 1)}
              </span>{" "}
              vs the previous period
            </span>
          )}
        </p>
      )}
    </div>
  );
}
