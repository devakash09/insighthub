"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { formatDelta } from "@/lib/format";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  changePct: number | null;
  /** Whether an increase is good (false for e.g. bounce rate, refunds). */
  upIsGood?: boolean;
  comparisonLabel?: string;
  spark?: number[];
  sparkColor?: string;
}

/**
 * Stat tile: label · value · signed delta vs named period · sparkline.
 * Delta color encodes direction × desirability, always paired with an icon.
 */
export function KpiCard({
  label,
  value,
  changePct,
  upIsGood = true,
  comparisonLabel = "vs last period",
  spark,
  sparkColor,
}: KpiCardProps) {
  const direction = changePct === null || Math.abs(changePct) < 0.05 ? "flat" : changePct > 0 ? "up" : "down";
  const good = direction === "flat" ? null : (direction === "up") === upIsGood;
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <Card className="gap-0 p-4">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 font-medium tabular-nums",
            good === true && "text-success",
            good === false && "text-destructive",
            good === null && "text-muted-foreground",
          )}
        >
          <Icon aria-hidden className="h-3.5 w-3.5" />
          {formatDelta(changePct)}
        </span>
        <span className="truncate text-muted-foreground">{comparisonLabel}</span>
      </p>
      {spark && spark.length > 1 && (
        <div className="mt-2 -mb-1">
          <Sparkline data={spark} color={sparkColor} />
        </div>
      )}
    </Card>
  );
}
