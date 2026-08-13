import { Suspense } from "react";
import type { Metadata } from "next";
import { Globe2, Map, MapPin, FileText, MonitorSmartphone } from "lucide-react";
import { getOrgContext } from "@/lib/auth/context";
import { resolveDateRange, type DateRange } from "@/lib/date-range";
import { getTrafficSources, getTrafficTimeseries } from "@/lib/analytics/traffic";
import { getGeoBreakdown, getTopRegions, getTopCities } from "@/lib/analytics/geo";
import { getDeviceBreakdown, getBrowserBreakdown } from "@/lib/analytics/devices";
import { getTopPages } from "@/lib/analytics/pages";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ChartCardSkeleton, TableCardSkeleton } from "@/components/dashboard/skeletons";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { seriesColor } from "@/components/charts/palette";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCompact,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
} from "@/lib/format";

export const metadata: Metadata = { title: "Traffic" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Fixed categorical order for acquisition channels. Palette slots follow this
 * entity order — a missing source never re-shifts the colors of the others.
 */
const SOURCE_ORDER = ["Organic Search", "Direct", "Social", "Referral", "Paid Ads", "Email"];

function sourceSlot(label: string): number {
  const i = SOURCE_ORDER.indexOf(label);
  return i === -1 ? SOURCE_ORDER.length : i;
}

export default async function TrafficPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const ctx = await getOrgContext();
  const range = resolveDateRange({
    range: first(params.range),
    from: first(params.from),
    to: first(params.to),
  });
  const suspenseKey = `${range.from.getTime()}-${range.to.getTime()}-${ctx.project.id}`;

  return (
    <div className="space-y-4">
      <PageHeader title="Traffic" description="Where sessions come from and where they land" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Suspense key={`ts-${suspenseKey}`} fallback={<ChartCardSkeleton height={300} />}>
          <SessionsBySourceCard projectId={ctx.project.id} range={range} />
        </Suspense>
        <Suspense key={`share-${suspenseKey}`} fallback={<ChartCardSkeleton height={220} />}>
          <SourceShareCard projectId={ctx.project.id} range={range} />
        </Suspense>

        <Suspense key={`perf-${suspenseKey}`} fallback={<TableCardSkeleton />}>
          <SourcePerformanceCard projectId={ctx.project.id} range={range} />
        </Suspense>

        <Suspense key={`geo-${suspenseKey}`} fallback={<ChartCardSkeleton height={320} />}>
          <TopCountriesCard projectId={ctx.project.id} range={range} />
        </Suspense>
        <Suspense key={`reg-${suspenseKey}`} fallback={<ChartCardSkeleton height={320} />}>
          <TopRegionsCard projectId={ctx.project.id} range={range} />
        </Suspense>
        <Suspense key={`city-${suspenseKey}`} fallback={<ChartCardSkeleton height={320} />}>
          <TopCitiesCard projectId={ctx.project.id} range={range} />
        </Suspense>

        <Suspense key={`dev-${suspenseKey}`} fallback={<ChartCardSkeleton height={190} />}>
          <DevicesCard projectId={ctx.project.id} range={range} />
        </Suspense>
        <Suspense key={`brow-${suspenseKey}`} fallback={<ChartCardSkeleton height={210} />}>
          <BrowsersCard projectId={ctx.project.id} range={range} />
        </Suspense>
        <Suspense key={`land-${suspenseKey}`} fallback={<ChartCardSkeleton height={210} />}>
          <LandingPagesCard projectId={ctx.project.id} range={range} />
        </Suspense>
      </div>
    </div>
  );
}

async function SessionsBySourceCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const rows = await getTrafficTimeseries(projectId, range);

  // Sources actually present in this window, kept in the fixed entity order.
  const present = SOURCE_ORDER.filter((label) => rows.some((r) => label in r));
  // Zero-fill missing keys per bucket so stacked areas never see undefined.
  const zeroDefaults = Object.fromEntries(present.map((label) => [label, 0]));
  const data = rows.map((r) => ({ ...zeroDefaults, ...r }));

  return (
    <ChartCard
      title="Sessions by source"
      description="Sessions per acquisition channel over time"
      className="lg:col-span-8"
    >
      {present.length === 0 ? (
        <EmptyState
          icon={Globe2}
          title="No traffic yet"
          description="Sessions will appear here as soon as your site receives visits in this period."
        />
      ) : (
        <TimeSeriesChart
          data={data as Record<string, unknown>[]}
          series={present.map((label) => ({
            key: label,
            label,
            colorIndex: sourceSlot(label),
          }))}
          type="area"
          stacked
          height={300}
          granularity={range.granularity}
        />
      )}
    </ChartCard>
  );
}

async function SourceShareCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const sources = await getTrafficSources(projectId, range);
  // Fixed entity order so donut slices reuse the same palette slots as the area chart.
  const ordered = [...sources].sort((a, b) => sourceSlot(a.source) - sourceSlot(b.source));
  return (
    <ChartCard title="Source share" description="Share of sessions by channel" className="lg:col-span-4">
      {ordered.length === 0 ? (
        <EmptyState
          icon={Globe2}
          title="No traffic yet"
          description="Channel share appears once sessions are tracked in this period."
        />
      ) : (
        <DonutChart
          data={ordered.map((s) => ({ name: s.source, value: s.sessions }))}
          centerValue={formatCompact(ordered.reduce((s, x) => s + x.sessions, 0))}
          centerLabel="sessions"
        />
      )}
    </ChartCard>
  );
}

async function SourcePerformanceCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const sources = await getTrafficSources(projectId, range);
  return (
    <ChartCard
      title="Source performance"
      description="Sessions, visitors, and conversions per channel"
      className="lg:col-span-12"
      contentClassName="overflow-x-auto scrollbar-thin"
    >
      {sources.length === 0 ? (
        <EmptyState
          icon={Globe2}
          title="No traffic yet"
          description="Channel performance appears once sessions are tracked in this period."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Visitors</TableHead>
              <TableHead className="text-right">Conversions</TableHead>
              <TableHead className="text-right">Conv. rate</TableHead>
              <TableHead className="text-right">Share</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((s) => (
              <TableRow key={s.source}>
                <TableCell>
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ background: seriesColor(sourceSlot(s.source)) }}
                    />
                    {s.source}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(s.sessions)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(s.visitors)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(s.conversions)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(s.sessions === 0 ? 0 : (s.conversions / s.sessions) * 100)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatPercent(s.sharePct)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ChartCard>
  );
}

async function TopCountriesCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const geo = await getGeoBreakdown(projectId, range, 10);
  const max = Math.max(1, ...geo.map((g) => g.sessions));
  return (
    <ChartCard
      title="Top countries"
      description="Sessions, visitors, and revenue by country"
      className="lg:col-span-6"
    >
      {geo.length === 0 ? (
        <EmptyState
          icon={Globe2}
          title="No location data"
          description="Geographic analytics appear once sessions are tracked."
        />
      ) : (
        <ul className="space-y-2.5">
          {geo.map((g) => (
            <li key={g.country} className="flex items-center gap-3 text-[13px]">
              <span className="w-28 truncate">{g.country}</span>
              <span className="relative h-4 flex-1 overflow-hidden rounded-sm bg-muted">
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 rounded-sm bg-[var(--chart-1)]"
                  style={{ width: `${(g.sessions / max) * 100}%` }}
                />
              </span>
              <span className="w-14 text-right font-medium tabular-nums">{formatCompact(g.sessions)}</span>
              <span className="hidden w-14 text-right text-xs text-muted-foreground tabular-nums sm:block">
                {formatCompact(g.visitors)}
              </span>
              <span className="hidden w-16 text-right text-xs text-muted-foreground tabular-nums sm:block">
                {formatCurrencyCompact(g.revenue)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

async function TopRegionsCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const regions = await getTopRegions(projectId, range);
  return (
    <ChartCard title="Top regions" description="Sessions by region" className="lg:col-span-3">
      {regions.length === 0 ? (
        <EmptyState
          icon={Map}
          title="No region data"
          description="Regions appear once sessions are tracked."
        />
      ) : (
        <ul className="space-y-2.5">
          {regions.map((r) => (
            <li key={`${r.name}-${r.country}`} className="flex items-center gap-3 text-[13px]">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{r.country}</span>
              </span>
              <span className="text-right font-medium tabular-nums">{formatCompact(r.sessions)}</span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

async function TopCitiesCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const cities = await getTopCities(projectId, range);
  return (
    <ChartCard title="Top cities" description="Sessions by city" className="lg:col-span-3">
      {cities.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No city data"
          description="Cities appear once sessions are tracked."
        />
      ) : (
        <ul className="space-y-2.5">
          {cities.map((c) => (
            <li key={`${c.name}-${c.country}`} className="flex items-center gap-3 text-[13px]">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{c.country}</span>
              </span>
              <span className="text-right font-medium tabular-nums">{formatCompact(c.sessions)}</span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

async function DevicesCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const devices = await getDeviceBreakdown(projectId, range);
  return (
    <ChartCard title="Devices" description="Sessions by device class" className="lg:col-span-4">
      {devices.length === 0 ? (
        <EmptyState
          icon={MonitorSmartphone}
          title="No device data"
          description="Device breakdowns appear once sessions are tracked."
        />
      ) : (
        <DonutChart
          data={devices.map((d) => ({ name: d.device, value: d.sessions }))}
          centerValue={formatPercent(devices[0].sharePct, 0)}
          centerLabel={devices[0].device}
          height={190}
        />
      )}
    </ChartCard>
  );
}

async function BrowsersCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const browsers = await getBrowserBreakdown(projectId, range);
  return (
    <ChartCard title="Browsers" description="Sessions by browser" className="lg:col-span-4">
      {browsers.length === 0 ? (
        <EmptyState
          icon={MonitorSmartphone}
          title="No browser data"
          description="Browser breakdowns appear once sessions are tracked."
        />
      ) : (
        <CategoryBarChart
          data={browsers.map((b) => ({ label: b.browser, value: b.sessions }))}
          horizontal
          height={210}
        />
      )}
    </ChartCard>
  );
}

async function LandingPagesCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const pages = await getTopPages(projectId, range, 6);
  return (
    <ChartCard title="Landing pages" description="Most viewed pages in this period" className="lg:col-span-4">
      {pages.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No page views yet"
          description="Top pages appear once page views are tracked."
        />
      ) : (
        <ul className="space-y-2.5">
          {pages.map((p) => (
            <li key={p.path} className="flex items-center gap-3 text-[13px]">
              <span className="min-w-0 flex-1 truncate font-medium">{p.path}</span>
              <span className="text-right text-muted-foreground tabular-nums">
                {formatCompact(p.views)} views
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
