"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronsUpDown, Inbox, Loader2, Play, Save, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ErrorState } from "@/components/dashboard/error-state";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { foldOther } from "@/components/charts/palette";
import { formatCompact, formatCurrencyCompact, formatDate, formatDateTime } from "@/lib/format";
import { resolveDateRange, type Granularity } from "@/lib/date-range";
import { cn } from "@/lib/utils";
import type { ReportConfig, ReportFilters } from "@/lib/validations/analytics";
import type { ReportResult } from "@/lib/analytics/reports";

// ── option labels ─────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<ReportConfig["metric"], string> = {
  users: "Users",
  sessions: "Sessions",
  page_views: "Page views",
  revenue: "Revenue",
  conversions: "Conversions",
  events: "Events",
};

const DIMENSION_LABELS: Record<ReportConfig["dimension"], string> = {
  date: "Date",
  country: "Country",
  device: "Device",
  browser: "Browser",
  source: "Traffic source",
  page: "Page",
};

const CHART_LABELS: Record<ReportConfig["chart"], string> = {
  line: "Line",
  bar: "Bar",
  area: "Area",
  pie: "Pie",
  table: "Table",
};

const DEVICE_OPTIONS = [
  { value: "DESKTOP", label: "Desktop" },
  { value: "MOBILE", label: "Mobile" },
  { value: "TABLET", label: "Tablet" },
] as const;

const BROWSER_OPTIONS = ["Chrome", "Safari", "Firefox", "Edge", "Other"] as const;

const SOURCE_OPTIONS = [
  { value: "ORGANIC", label: "Organic" },
  { value: "DIRECT", label: "Direct" },
  { value: "SOCIAL", label: "Social" },
  { value: "REFERRAL", label: "Referral" },
  { value: "PAID", label: "Paid" },
  { value: "EMAIL", label: "Email" },
] as const;

const SCHEDULE_OPTIONS = [
  { value: "NONE", label: "None" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
] as const;

type Schedule = (typeof SCHEDULE_OPTIONS)[number]["value"];

/** Dimensions the revenue metric supports (mirrors the server constraint). */
const REVENUE_DIMENSIONS: ReportConfig["dimension"][] = ["date", "country"];
const SESSION_FAMILY_METRICS: ReportConfig["metric"][] = ["users", "sessions", "conversions"];

type QueryStatus = "idle" | "loading" | "error" | "ready";

// ── main component ────────────────────────────────────────────────────────────

export function ReportBuilder({
  countries,
  eventNames,
  canSave,
  initialConfig,
}: {
  countries: string[];
  eventNames: string[];
  canSave: boolean;
  initialConfig: ReportConfig;
}) {
  const searchParams = useSearchParams();
  const range = searchParams.get("range") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const resolved = useMemo(() => resolveDateRange({ range, from, to }), [range, from, to]);

  const [config, setConfig] = useState<ReportConfig>(initialConfig);
  const [appliedConfig, setAppliedConfig] = useState<ReportConfig | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const appliedRef = useRef<ReportConfig>(initialConfig);
  const requestSeq = useRef(0);

  // Recreated when the URL range changes; the effect below then re-runs the
  // last applied config against the new window.
  const runQuery = useCallback(async (cfg: ReportConfig) => {
    const id = ++requestSeq.current;
    appliedRef.current = cfg;
    setAppliedConfig(cfg);
    setStatus("loading");
    try {
      const res = await fetch("/api/analytics/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg, range: { range, from, to } }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "We couldn't run this query. Try again.");
      }
      const body = (await res.json()) as { result: ReportResult };
      if (id !== requestSeq.current) return;
      setResult(body.result);
      setStatus("ready");
    } catch (err) {
      if (id !== requestSeq.current) return;
      setErrorMsg(err instanceof Error ? err.message : "We couldn't run this query. Try again.");
      setStatus("error");
    }
  }, [range, from, to]);

  // Auto-run on mount, and re-run the last applied config when the global
  // date picker changes the URL range.
  useEffect(() => {
    void runQuery(appliedRef.current);
  }, [runQuery]);

  const updateFilters = (patch: Partial<ReportFilters>) =>
    setConfig((c) => ({ ...c, filters: { ...c.filters, ...patch } }));

  const onMetricChange = (value: string) => {
    const metric = value as ReportConfig["metric"];
    setConfig((c) => ({
      ...c,
      metric,
      dimension:
        metric === "revenue" && !REVENUE_DIMENSIONS.includes(c.dimension) ? "date" : c.dimension,
      filters: metric === "events" ? c.filters : { ...c.filters, event: undefined },
    }));
  };

  const isRevenue = config.metric === "revenue";
  const landingPageCaption =
    config.dimension === "page" && SESSION_FAMILY_METRICS.includes(config.metric);
  const loading = status === "loading";

  const resultTitle = appliedConfig
    ? `${METRIC_LABELS[appliedConfig.metric]} by ${DIMENSION_LABELS[appliedConfig.dimension].toLowerCase()}`
    : "Results";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* ── control panel ──────────────────────────────────────────────────── */}
      <Card className="gap-4 self-start lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Report settings</CardTitle>
          <CardDescription className="text-xs">
            Choose what to measure and how to slice it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rb-metric" className="text-xs">
              Metric
            </Label>
            <Select value={config.metric} onValueChange={onMetricChange}>
              <SelectTrigger id="rb-metric" size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METRIC_LABELS) as ReportConfig["metric"][]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {METRIC_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rb-dimension" className="text-xs">
              Dimension
            </Label>
            <Select
              value={config.dimension}
              onValueChange={(v) => setConfig((c) => ({ ...c, dimension: v as ReportConfig["dimension"] }))}
            >
              <SelectTrigger id="rb-dimension" size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DIMENSION_LABELS) as ReportConfig["dimension"][]).map((d) => (
                  <SelectItem key={d} value={d} disabled={isRevenue && !REVENUE_DIMENSIONS.includes(d)}>
                    {DIMENSION_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isRevenue && (
              <p className="text-[11px] text-muted-foreground">
                Revenue can only be grouped by date or country.
              </p>
            )}
            {landingPageCaption && (
              <p className="text-[11px] text-muted-foreground">Grouped by landing page</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rb-chart" className="text-xs">
              Visualization
            </Label>
            <Select
              value={config.chart}
              onValueChange={(v) => setConfig((c) => ({ ...c, chart: v as ReportConfig["chart"] }))}
            >
              <SelectTrigger id="rb-chart" size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CHART_LABELS) as ReportConfig["chart"][]).map((chart) => (
                  <SelectItem key={chart} value={chart}>
                    {CHART_LABELS[chart]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <p className="text-xs font-medium text-muted-foreground">Filters</p>

          <FilterField
            label="Country"
            active={config.filters.country !== undefined}
            onClear={() => updateFilters({ country: undefined })}
          >
            <CountryCombobox
              countries={countries}
              value={config.filters.country}
              onChange={(country) => updateFilters({ country })}
            />
          </FilterField>

          <FilterField
            label="Device"
            active={config.filters.device !== undefined}
            onClear={() => updateFilters({ device: undefined })}
          >
            <Select
              value={config.filters.device ?? ""}
              onValueChange={(v) => updateFilters({ device: v as ReportFilters["device"] })}
            >
              <SelectTrigger size="sm" className="w-full" aria-label="Device filter">
                <SelectValue placeholder="All devices" />
              </SelectTrigger>
              <SelectContent>
                {DEVICE_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField
            label="Browser"
            active={config.filters.browser !== undefined}
            onClear={() => updateFilters({ browser: undefined })}
          >
            <Select
              value={config.filters.browser ?? ""}
              onValueChange={(v) => updateFilters({ browser: v })}
            >
              <SelectTrigger size="sm" className="w-full" aria-label="Browser filter">
                <SelectValue placeholder="All browsers" />
              </SelectTrigger>
              <SelectContent>
                {BROWSER_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField
            label="Traffic source"
            active={config.filters.source !== undefined}
            onClear={() => updateFilters({ source: undefined })}
          >
            <Select
              value={config.filters.source ?? ""}
              onValueChange={(v) => updateFilters({ source: v as ReportFilters["source"] })}
            >
              <SelectTrigger size="sm" className="w-full" aria-label="Traffic source filter">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          {config.metric === "events" &&
            (eventNames.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No events defined yet — all tracked events are included.
              </p>
            ) : (
              <FilterField
                label="Event"
                active={config.filters.event !== undefined}
                onClear={() => updateFilters({ event: undefined })}
              >
                <Select
                  value={config.filters.event ?? ""}
                  onValueChange={(v) => updateFilters({ event: v })}
                >
                  <SelectTrigger size="sm" className="w-full" aria-label="Event filter">
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            ))}

          <Button className="w-full" disabled={loading} onClick={() => void runQuery(config)}>
            {loading ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              <Play aria-hidden />
            )}
            Apply filters
          </Button>
        </CardContent>
      </Card>

      {/* ── result panel ───────────────────────────────────────────────────── */}
      <ChartCard
        title={resultTitle}
        description={resolved.label}
        className="lg:col-span-8"
        action={
          canSave ? (
            <SaveReportDialog config={appliedConfig ?? config} />
          ) : undefined
        }
      >
        {status === "idle" && (
          <EmptyState
            icon={SlidersHorizontal}
            title="Configure a report"
            description="Pick a metric and dimension, then apply filters to run your first query."
          />
        )}
        {status === "loading" && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        )}
        {status === "error" && (
          <ErrorState
            title="Query failed"
            description={errorMsg ?? "We couldn't load this data. Try again in a moment."}
            onRetry={() => void runQuery(appliedRef.current)}
          />
        )}
        {status === "ready" && result && (
          result.rows.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No data for this selection"
              description="Try a wider date range or remove some filters."
            />
          ) : (
            <ResultView
              result={result}
              chart={appliedConfig?.chart ?? config.chart}
              granularity={resolved.granularity}
            />
          )
        )}
      </ChartCard>
    </div>
  );
}

// ── result rendering ──────────────────────────────────────────────────────────

function ResultView({
  result,
  chart,
  granularity,
}: {
  result: ReportResult;
  chart: ReportConfig["chart"];
  granularity: Granularity;
}) {
  const fmt = result.unit === "currency" ? formatCurrencyCompact : formatCompact;
  const metricLabel = METRIC_LABELS[result.metric];
  const labelFor = (label: string) =>
    result.dimension === "date"
      ? granularity === "hour"
        ? formatDateTime(label)
        : formatDate(label)
      : label;

  // Line/area only make sense over time — categorical dimensions fall back to bars.
  const effective =
    (chart === "line" || chart === "area") && result.dimension !== "date" ? "bar" : chart;

  if (effective === "line" || effective === "area") {
    return (
      <TimeSeriesChart
        data={result.rows.map((r) => ({ bucket: r.label, value: r.value }))}
        series={[{ key: "value", label: metricLabel }]}
        type={effective}
        height={340}
        granularity={granularity}
        valueFormatter={fmt}
      />
    );
  }

  if (effective === "bar") {
    return (
      <CategoryBarChart
        data={result.rows.map((r) => ({ label: labelFor(r.label), value: r.value }))}
        horizontal={result.dimension === "country" || result.dimension === "page"}
        height={340}
        valueFormatter={fmt}
      />
    );
  }

  if (effective === "pie") {
    const data = foldOther(
      result.rows.map((r) => ({ name: labelFor(r.label), value: r.value })),
      8,
      (sum) => ({ name: "Other", value: sum }),
    );
    const total = result.rows.reduce((s, r) => s + r.value, 0);
    return (
      <DonutChart
        data={data}
        height={260}
        valueFormatter={fmt}
        centerValue={fmt(total)}
        centerLabel={metricLabel.toLowerCase()}
      />
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{DIMENSION_LABELS[result.dimension]}</TableHead>
            <TableHead className="text-right">{metricLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell className="max-w-[320px] truncate font-medium">{labelFor(r.label)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(r.value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── filter scaffolding ────────────────────────────────────────────────────────

function FilterField({
  label,
  active,
  onClear,
  children,
}: {
  label: string;
  active: boolean;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function CountryCombobox({
  countries,
  value,
  onChange,
}: {
  countries: string[];
  value: string | undefined;
  onChange: (country: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = countries.filter((c) => c.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label="Country filter"
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        >
          <span className="truncate">{value ?? "All countries"}</span>
          <ChevronsUpDown aria-hidden className="size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-56 p-2" align="start">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search countries"
          className="h-8"
          aria-label="Search countries"
        />
        <ul role="listbox" aria-label="Countries" className="mt-2 max-h-52 space-y-0.5 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-2 py-3 text-center text-xs text-muted-foreground">No matching countries</li>
          ) : (
            filtered.map((country) => (
              <li key={country}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === country}
                  onClick={() => {
                    onChange(country === value ? undefined : country);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Check
                    aria-hidden
                    className={cn("size-3.5 shrink-0", value === country ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">{country}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

// ── save dialog ───────────────────────────────────────────────────────────────

function SaveReportDialog({ config }: { config: ReportConfig }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState<Schedule>("NONE");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          config,
          schedule,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "We couldn't save the report. Try again.");
      }
      toast.success("Report saved");
      setOpen(false);
      setName("");
      setDescription("");
      setSchedule("NONE");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't save the report. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Save aria-hidden />
          Save report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>Save report</DialogTitle>
            <DialogDescription>
              Save this configuration so you can re-run it later or share it with your team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="report-name">Name</Label>
            <Input
              id="report-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sessions by country"
              required
              minLength={2}
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-description">Description (optional)</Label>
            <Textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this report show?"
              rows={3}
              maxLength={300}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-schedule">Schedule</Label>
            <Select value={schedule} onValueChange={(v) => setSchedule(v as Schedule)}>
              <SelectTrigger id="report-schedule" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 aria-hidden className="animate-spin" />}
              Save report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
