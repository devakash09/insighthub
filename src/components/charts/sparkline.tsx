"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useId } from "react";

/** Tiny 12-point trend for stat tiles — no axes, no tooltip, pure shape. */
export function Sparkline({ data, color = "var(--chart-1)" }: { data: number[]; color?: string }) {
  const id = useId().replace(/[:]/g, "");
  const rows = data.map((v, i) => ({ i, v }));
  return (
    <div aria-hidden className="h-9 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            dataKey="v"
            type="monotone"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${id})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
