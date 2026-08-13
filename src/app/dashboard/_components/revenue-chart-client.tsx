"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { formatCompact, formatCurrencyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TimeseriesPoint } from "@/lib/analytics/types";
import type { Granularity } from "@/lib/date-range";

const METRICS = [
  { key: "revenue", label: "Revenue", currency: true },
  { key: "sessions", label: "Sessions", currency: false },
  { key: "pageViews", label: "Page views", currency: false },
  { key: "conversions", label: "Conversions", currency: false },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

/**
 * The hero trend chart: metric pills switch the plotted series (units differ,
 * so one series at a time — never a second axis); granularity toggles are
 * URL-driven so the server re-aggregates.
 */
export function RevenueChartClient({
  data,
  granularity,
  showGranularityToggle,
}: {
  data: TimeseriesPoint[];
  granularity: Granularity;
  showGranularityToggle: boolean;
}) {
  const [metric, setMetric] = useState<MetricKey>("revenue");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = METRICS.find((m) => m.key === metric)!;

  const granularityHref = (g: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("g", g);
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Metric" className="flex flex-wrap gap-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              role="tab"
              aria-selected={metric === m.key}
              onClick={() => setMetric(m.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                metric === m.key
                  ? "bg-primary/10 text-primary dark:bg-primary/15"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {showGranularityToggle && (
          <div className="flex rounded-md border p-0.5" aria-label="Aggregation">
            {(["day", "week", "month"] as const).map((g) => (
              <Link
                key={g}
                href={granularityHref(g)}
                scroll={false}
                aria-current={granularity === g ? "true" : undefined}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium capitalize",
                  granularity === g ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {g === "day" ? "Daily" : g === "week" ? "Weekly" : "Monthly"}
              </Link>
            ))}
          </div>
        )}
      </div>
      <TimeSeriesChart
        data={data as unknown as Record<string, unknown>[]}
        series={[{ key: active.key, label: active.label }]}
        type="area"
        height={300}
        granularity={granularity}
        valueFormatter={active.currency ? formatCurrencyCompact : formatCompact}
      />
    </div>
  );
}
