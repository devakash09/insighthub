"use client";

/** Shared tooltip chrome so every chart's hover layer looks identical. */
export function ChartTooltipFrame({
  label,
  items,
}: {
  label: string;
  items: { name: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            {item.color ? (
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: item.color }} />
            ) : null}
            <span className="text-muted-foreground">{item.name}</span>
            <span className="ml-auto pl-4 font-semibold tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
