"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltipFrame } from "@/components/charts/chart-tooltip";
import { seriesColor, CHART_GRID, CHART_AXIS } from "@/components/charts/palette";
import { VALUE_FORMATTERS, type ValueFormat } from "@/components/charts/time-series-chart";

export interface CategoryDatum {
  label: string;
  value: number;
}

interface CategoryBarChartProps {
  data: CategoryDatum[];
  height?: number;
  /** Horizontal layout suits long category names. */
  horizontal?: boolean;
  valueFormatter?: (n: number) => string;
  /** Server components can't pass functions — use this instead. */
  format?: ValueFormat;
  /** Single-hue by default (magnitude); set to color per-category (identity). */
  categorical?: boolean;
  colorIndex?: number;
}

/**
 * Magnitude comparison bars: one hue by default (sequential job), ≤24px thick,
 * 4px rounded data-end, square baseline.
 */
export function CategoryBarChart({
  data,
  height = 260,
  horizontal = false,
  valueFormatter,
  format = "compact",
  categorical = false,
  colorIndex = 0,
}: CategoryBarChartProps) {
  valueFormatter ??= VALUE_FORMATTERS[format];
  const baseColor = seriesColor(colorIndex);

  const tooltip = (
    <Tooltip
      cursor={{ fill: "var(--accent)", opacity: 0.5 }}
      content={({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const p = payload[0];
        const idx = data.findIndex((d) => d.label === p.payload.label);
        return (
          <ChartTooltipFrame
            label={String(p.payload.label)}
            items={[
              {
                name: "Value",
                value: valueFormatter(Number(p.value ?? 0)),
                color: categorical ? seriesColor(idx) : baseColor,
              },
            ]}
          />
        );
      }}
    />
  );

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }} barCategoryGap="28%">
          <CartesianGrid horizontal={false} stroke={CHART_GRID} strokeWidth={1} />
          <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => valueFormatter(Number(v))} />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: CHART_AXIS, strokeWidth: 1 }}
            width={110}
            tick={{ fontSize: 11 }}
          />
          {tooltip}
          <Bar dataKey="value" maxBarSize={20} radius={[0, 4, 4, 0]} animationDuration={500}>
            {data.map((d, i) => (
              <Cell key={d.label} fill={categorical ? seriesColor(i) : baseColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={CHART_GRID} strokeWidth={1} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: CHART_AXIS, strokeWidth: 1 }}
          tick={{ fontSize: 11 }}
          interval={0}
          angle={data.length > 8 ? -30 : 0}
          textAnchor={data.length > 8 ? "end" : "middle"}
          height={data.length > 8 ? 56 : 30}
        />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => valueFormatter(Number(v))} width={52} />
        {tooltip}
        <Bar dataKey="value" maxBarSize={24} radius={[4, 4, 0, 0]} animationDuration={500}>
          {data.map((d, i) => (
            <Cell key={d.label} fill={categorical ? seriesColor(i) : baseColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
