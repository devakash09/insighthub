"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FunnelStage } from "@/lib/analytics/types";

const MAX_STEPS = 8;
const MIN_STEPS = 2;

/** Sequential single-hue fill: 100% of chart-1 at the top stage, fading to 40%. */
function stageMix(index: number, count: number): number {
  if (count <= 1) return 100;
  return Math.round(100 - (index * 60) / (count - 1));
}

export function FunnelBuilder({
  eventNames,
  initialSteps,
  initialStages,
}: {
  eventNames: string[];
  initialSteps: string[];
  initialStages: FunnelStage[];
}) {
  const searchParams = useSearchParams();
  const [steps, setSteps] = useState<string[]>(initialSteps);
  const [stages, setStages] = useState<FunnelStage[]>(initialStages);
  const [loading, setLoading] = useState(false);

  // Steps may include seeded defaults that have no definition row yet.
  const options = useMemo(() => {
    const set = new Set([...eventNames, ...steps]);
    return [...set];
  }, [eventNames, steps]);

  const setStep = (index: number, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const addStep = () => {
    if (steps.length >= MAX_STEPS) return;
    const unused = options.find((name) => !steps.includes(name));
    setSteps((prev) => [...prev, unused ?? options[0] ?? ""]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= MIN_STEPS) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const apply = async () => {
    setLoading(true);
    try {
      const range: Record<string, string> = {};
      for (const key of ["range", "from", "to"] as const) {
        const value = searchParams.get(key);
        if (value) range[key] = value;
      }
      const res = await fetch("/api/funnels/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps, range }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof json?.error === "string" ? json.error : "Could not compute the funnel. Try again.";
        toast.error(message);
        return;
      }
      setStages(json.stages as FunnelStage[]);
    } catch {
      toast.error("Could not compute the funnel. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const first = stages[0];
  const last = stages[stages.length - 1];
  const overallPct = first && first.users > 0 ? (last.users / first.users) * 100 : 0;
  const biggestDrop =
    stages.length > 1
      ? stages.slice(1).reduce((worst, s) => (s.dropOffPct > worst.dropOffPct ? s : worst))
      : null;
  const hasData = stages.length > 0 && first.users > 0;

  return (
    <ChartCard
      title="Funnel builder"
      description="Pick the sequence of events users must complete, in order"
    >
      <div className="space-y-5">
        {/* Step editor */}
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1 rounded-md border p-1 pl-2">
              <span className="text-xs font-medium text-muted-foreground tabular-nums">{i + 1}.</span>
              <Select value={step} onValueChange={(v) => setStep(i, v)}>
                <SelectTrigger size="sm" aria-label={`Step ${i + 1} event`} className="border-0 shadow-none">
                  <SelectValue placeholder="Pick an event" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {steps.length > MIN_STEPS && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeStep(i)}
                  aria-label={`Remove step ${i + 1}`}
                >
                  <X aria-hidden className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          {steps.length < MAX_STEPS && (
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus aria-hidden className="h-3.5 w-3.5" />
              Add step
            </Button>
          )}
          <Button type="button" size="sm" onClick={apply} disabled={loading}>
            {loading && <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />}
            Apply
          </Button>
        </div>

        {!hasData ? (
          <EmptyState
            icon={Filter}
            title="No users entered this funnel"
            description="Nobody completed the first step in the selected period. Try a different first event or a wider date range."
          />
        ) : (
          <>
            {/* Summary chips */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Overall conversion</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{formatPercent(overallPct)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatCompact(last.users)} of {formatCompact(first.users)} users reached {last.label}
                </p>
              </div>
              {biggestDrop && (
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Biggest drop-off</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatPercent(biggestDrop.dropOffPct)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    lost before {biggestDrop.label}
                  </p>
                </div>
              )}
            </div>

            {/* The funnel */}
            <div>
              {stages.map((stage, i) => (
                <div key={`${stage.name}-${i}`}>
                  {i > 0 && (
                    <p className="py-1 text-center text-xs text-muted-foreground">
                      <span aria-hidden>↓ </span>
                      {formatPercent(stage.conversionPct, 0)} continued ·{" "}
                      <span className={cn(stage.dropOffPct > 60 && "text-destructive")}>
                        {formatPercent(stage.dropOffPct, 0)} dropped off
                      </span>
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-40 shrink-0 sm:w-44">
                      <p className="truncate text-[13px] font-medium">{stage.label}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatCompact(stage.users)} users
                      </p>
                    </div>
                    <div className="h-9 flex-1 overflow-hidden rounded-[6px] bg-muted">
                      <div
                        className="h-full rounded-[6px]"
                        style={{
                          width: `${(stage.users / first.users) * 100}%`,
                          background: `color-mix(in oklab, var(--chart-1) ${stageMix(i, stages.length)}%, transparent)`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ChartCard>
  );
}
