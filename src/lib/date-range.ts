/**
 * Global date-range system. A range is resolved from URL search params
 * (`?range=30d` or `?range=custom&from=2026-01-01&to=2026-02-01`) into the
 * current window plus the immediately-preceding comparison window.
 */

export type RangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "this-month"
  | "last-month"
  | "this-year"
  | "custom";

export type Granularity = "hour" | "day" | "week" | "month";

export interface DateRange {
  key: RangeKey;
  label: string;
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  /** Whole days covered by the window (>= 1). */
  days: number;
  /** Default chart bucket for this window size. */
  granularity: Granularity;
}

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "this-year", label: "This year" },
  { key: "custom", label: "Custom range" },
];

const DAY = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function defaultGranularity(days: number): Granularity {
  if (days <= 2) return "hour";
  if (days <= 92) return "day";
  if (days <= 400) return "week";
  return "month";
}

export function resolveDateRange(params: { range?: string; from?: string; to?: string }, now = new Date()): DateRange {
  const key = (RANGE_OPTIONS.some((o) => o.key === params.range) ? params.range : "30d") as RangeKey;
  const todayStart = startOfDay(now);

  let from: Date;
  let to: Date;
  switch (key) {
    case "today":
      from = todayStart;
      to = now;
      break;
    case "yesterday":
      from = new Date(todayStart.getTime() - DAY);
      to = todayStart;
      break;
    case "7d":
      from = new Date(todayStart.getTime() - 6 * DAY);
      to = now;
      break;
    case "90d":
      from = new Date(todayStart.getTime() - 89 * DAY);
      to = now;
      break;
    case "this-month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = now;
      break;
    case "last-month":
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "this-year":
      from = new Date(now.getFullYear(), 0, 1);
      to = now;
      break;
    case "custom": {
      const parsedFrom = params.from ? new Date(`${params.from}T00:00:00`) : null;
      const parsedTo = params.to ? new Date(`${params.to}T00:00:00`) : null;
      if (parsedFrom && parsedTo && !isNaN(+parsedFrom) && !isNaN(+parsedTo) && parsedFrom < parsedTo) {
        from = parsedFrom;
        to = new Date(Math.min(parsedTo.getTime() + DAY, now.getTime())); // inclusive end date
      } else {
        from = new Date(todayStart.getTime() - 29 * DAY);
        to = now;
      }
      break;
    }
    case "30d":
    default:
      from = new Date(todayStart.getTime() - 29 * DAY);
      to = now;
      break;
  }

  const spanMs = to.getTime() - from.getTime();
  const days = Math.max(1, Math.round(spanMs / DAY));
  const prevTo = from;
  const prevFrom = new Date(from.getTime() - spanMs);
  const label = RANGE_OPTIONS.find((o) => o.key === key)!.label;

  return { key, label, from, to, prevFrom, prevTo, days, granularity: defaultGranularity(days) };
}

/** Local-date `YYYY-MM-DD` (toISOString would shift the day across timezones). */
export function toLocalDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Serialize a range back into search params (used by links that must preserve it). */
export function rangeToParams(range: DateRange): Record<string, string> {
  if (range.key !== "custom") return { range: range.key };
  return {
    range: "custom",
    from: toLocalDateString(range.from),
    to: toLocalDateString(new Date(range.to.getTime() - DAY)),
  };
}
