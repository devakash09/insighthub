"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { RANGE_OPTIONS, resolveDateRange, toLocalDateString, type RangeKey } from "@/lib/date-range";
import { cn } from "@/lib/utils";

/**
 * Global date-range control. Writes `?range=` (+ `from`/`to` for custom) to the
 * URL so every server component re-queries; comparison period is implicit
 * (the window immediately before).
 */
export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const current = resolveDateRange({
    range: searchParams.get("range") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  const [customFrom, setCustomFrom] = useState(toLocalDateString(current.from));
  const [customTo, setCustomTo] = useState(toLocalDateString(new Date(current.to.getTime() - 1)));

  const apply = (key: RangeKey, from?: string, to?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", key);
    if (key === "custom" && from && to) {
      params.set("from", from);
      params.set("to", to);
    } else {
      params.delete("from");
      params.delete("to");
    }
    params.delete("page"); // reset pagination when the window changes
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  };

  const label =
    current.key === "custom"
      ? `${current.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(
          current.to.getTime() - 1,
        ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : current.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
          <CalendarDays aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[130px] truncate">{label}</span>
          <ChevronDown aria-hidden className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <div role="listbox" aria-label="Date range presets">
          {RANGE_OPTIONS.filter((o) => o.key !== "custom").map((option) => (
            <button
              key={option.key}
              role="option"
              aria-selected={current.key === option.key}
              onClick={() => apply(option.key)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-accent",
                current.key === option.key && "font-medium",
              )}
            >
              {option.label}
              {current.key === option.key && <Check aria-hidden className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
        <Separator className="my-1" />
        <div className="space-y-2 p-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Custom range</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="dr-from" className="text-[11px] text-muted-foreground">
                From
              </Label>
              <Input
                id="dr-from"
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dr-to" className="text-[11px] text-muted-foreground">
                To
              </Label>
              <Input
                id="dr-to"
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!customFrom || !customTo || customFrom > customTo}
            onClick={() => apply("custom", customFrom, customTo)}
          >
            Apply range
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
