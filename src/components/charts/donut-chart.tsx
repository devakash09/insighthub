"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltipFrame } from "@/components/charts/chart-tooltip";
import { seriesColor } from "@/components/charts/palette";
import { formatPercent } from "@/lib/format";
import { VALUE_FORMATTERS, type ValueFormat } from "@/components/charts/time-series-chart";

export interface DonutDatum {
  name: string;
  value: number;
}

interface DonutChartProps {
  data: DonutDatum[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  valueFormatter?: (n: number) => string;
  /** Server components can't pass functions — use this instead. */
  format?: ValueFormat;
}

/**
 * Part-to-whole donut with a persistent side legend (identity is never
 * color-alone) and a 2px surface gap between segments.
 */
export function DonutChart({
  data,
  height = 220,
  centerLabel,
  centerValue,
  valueFormatter,
  format = "compact",
}: DonutChartProps) {
  valueFormatter ??= VALUE_FORMATTERS[format];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0];
                const idx = data.findIndex((d) => d.name === p.name);
                return (
                  <ChartTooltipFrame
                    label={String(p.name)}
                    items={[
                      { name: "Value", value: valueFormatter(Number(p.value ?? 0)), color: seriesColor(idx) },
                      { name: "Share", value: total ? formatPercent((Number(p.value) / total) * 100) : "0%" },
                    ]}
                  />
                );
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
              animationDuration={500}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={seriesColor(i)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerValue) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <span className="text-lg font-semibold">{centerValue}</span>}
            {centerLabel && <span className="text-[11px] text-muted-foreground">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-xs">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: seriesColor(i) }} />
            <span className="truncate text-muted-foreground">{d.name}</span>
            <span className="ml-auto pl-2 font-medium tabular-nums">
              {total ? formatPercent((d.value / total) * 100, 0) : "0%"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
