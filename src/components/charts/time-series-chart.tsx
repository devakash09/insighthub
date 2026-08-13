"use client";

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltipFrame } from "@/components/charts/chart-tooltip";
import { seriesColor, CHART_GRID, CHART_AXIS } from "@/components/charts/palette";
import { formatCompact, formatCurrencyCompact } from "@/lib/format";
import type { Granularity } from "@/lib/date-range";

/** Serializable alternative to `valueFormatter` for server-component callers. */
export type ValueFormat = "compact" | "currency";
export const VALUE_FORMATTERS: Record<ValueFormat, (n: number) => string> = {
  compact: formatCompact,
  currency: formatCurrencyCompact,
};

export interface SeriesDef {
  key: string;
  label: string;
  /** Explicit slot index into the categorical palette (defaults to position). */
  colorIndex?: number;
}

interface TimeSeriesChartProps {
  data: Record<string, unknown>[];
  /** Key holding the ISO timestamp for each row. */
  xKey?: string;
  series: SeriesDef[];
  type?: "line" | "area";
  height?: number;
  granularity?: Granularity;
  valueFormatter?: (n: number) => string;
  /** Server components can't pass functions — use this instead. */
  format?: ValueFormat;
  /** Stack the areas (used for composition-over-time views). */
  stacked?: boolean;
}

function formatTick(iso: string, granularity: Granularity): string {
  const d = new Date(iso);
  if (granularity === "hour") return d.toLocaleTimeString("en-US", { hour: "numeric" });
  if (granularity === "month") return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTooltipLabel(iso: string, granularity: Granularity): string {
  const d = new Date(iso);
  if (granularity === "hour") {
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" });
  }
  if (granularity === "week") {
    return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  if (granularity === "month") return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const legendFormatter = (value: string) => (
  <span className="text-xs text-muted-foreground">{value}</span>
);

/**
 * The workhorse trend chart: 2px lines / 10%-wash areas, hairline solid grid,
 * crosshair tooltip, legend whenever there are 2+ series.
 */
export function TimeSeriesChart({
  data,
  xKey = "bucket",
  series,
  type = "line",
  height = 280,
  granularity = "day",
  valueFormatter,
  format = "compact",
  stacked = false,
}: TimeSeriesChartProps) {
  valueFormatter ??= VALUE_FORMATTERS[format];
  const gradientId = useId().replace(/[:]/g, "");
  const colors = useMemo(() => series.map((s, i) => seriesColor(s.colorIndex ?? i)), [series]);
  const showLegend = series.length >= 2;

  const tooltip = (
    <Tooltip
      cursor={{ stroke: CHART_AXIS, strokeWidth: 1 }}
      content={({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
          <ChartTooltipFrame
            label={formatTooltipLabel(String(label), granularity)}
            items={payload.map((p) => ({
              name: String(p.name),
              value: valueFormatter(Number(p.value ?? 0)),
              color: String(p.color),
            }))}
          />
        );
      }}
    />
  );

  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={CHART_GRID} strokeWidth={1} />
      <XAxis
        dataKey={xKey}
        tickLine={false}
        axisLine={{ stroke: CHART_AXIS, strokeWidth: 1 }}
        tickFormatter={(v) => formatTick(String(v), granularity)}
        minTickGap={32}
        dy={6}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        tickFormatter={(v) => valueFormatter(Number(v))}
        width={52}
      />
    </>
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "area" ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`${gradientId}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors[i]} stopOpacity={0.18} />
                <stop offset="100%" stopColor={colors[i]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          {axes}
          {tooltip}
          {showLegend && <Legend iconType="plainline" iconSize={12} formatter={legendFormatter} />}
          {series.map((s, i) => (
            <Area
              key={s.key}
              dataKey={s.key}
              name={s.label}
              type="monotone"
              stroke={colors[i]}
              strokeWidth={2}
              strokeLinecap="round"
              fill={stacked ? colors[i] : `url(#${gradientId}-${i})`}
              fillOpacity={stacked ? 0.75 : 1}
              stackId={stacked ? "stack" : undefined}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              animationDuration={600}
            />
          ))}
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {axes}
          {tooltip}
          {showLegend && <Legend iconType="plainline" iconSize={12} formatter={legendFormatter} />}
          {series.map((s, i) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.label}
              type="monotone"
              stroke={colors[i]}
              strokeWidth={2}
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              animationDuration={600}
            />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
