import Link from "next/link";
import { Globe2, MousePointerClick } from "lucide-react";
import { getOverviewTimeseries } from "@/lib/analytics/overview";
import { getTrafficSources } from "@/lib/analytics/traffic";
import { getGeoBreakdown } from "@/lib/analytics/geo";
import { getDeviceBreakdown, getBrowserBreakdown } from "@/lib/analytics/devices";
import { getTopPages } from "@/lib/analytics/pages";
import { getRecentActivity } from "@/lib/analytics/activity";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { RevenueChartClient } from "@/app/dashboard/_components/revenue-chart-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  formatCompact,
  formatCurrencyCompact,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelative,
} from "@/lib/format";
import type { DateRange, Granularity } from "@/lib/date-range";

export async function RevenueCard({
  projectId,
  range,
  granularity,
}: {
  projectId: string;
  range: DateRange;
  granularity: Granularity;
}) {
  const data = await getOverviewTimeseries(projectId, range, granularity);
  return (
    <ChartCard
      title="Performance"
      description="Revenue, sessions, and engagement across the selected period"
      className="lg:col-span-8"
    >
      <RevenueChartClient data={data} granularity={granularity} showGranularityToggle={range.days > 13} />
    </ChartCard>
  );
}

export async function TrafficSourcesCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const sources = await getTrafficSources(projectId, range);
  return (
    <ChartCard title="Traffic sources" description="Sessions by acquisition channel" className="lg:col-span-4">
      {sources.length === 0 ? (
        <EmptyState
          icon={Globe2}
          title="No traffic yet"
          description="Sessions will appear here as soon as your site receives visits in this period."
        />
      ) : (
        <DonutChart
          data={sources.map((s) => ({ name: s.source, value: s.sessions }))}
          centerValue={formatCompact(sources.reduce((s, x) => s + x.sessions, 0))}
          centerLabel="sessions"
        />
      )}
    </ChartCard>
  );
}

export async function UserGrowthCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const data = await getOverviewTimeseries(projectId, range);
  return (
    <ChartCard
      title="User growth"
      description="New, returning, and active users over time"
      className="lg:col-span-8"
    >
      <TimeSeriesChart
        data={data as unknown as Record<string, unknown>[]}
        series={[
          { key: "newUsers", label: "New users" },
          { key: "returningUsers", label: "Returning users" },
          { key: "activeUsers", label: "Active users" },
        ]}
        type="line"
        height={260}
        granularity={range.granularity}
      />
    </ChartCard>
  );
}

export async function DevicesCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const devices = await getDeviceBreakdown(projectId, range);
  return (
    <ChartCard title="Devices" description="Sessions by device class" className="lg:col-span-4">
      <DonutChart
        data={devices.map((d) => ({ name: d.device, value: d.sessions }))}
        centerValue={devices.length ? formatPercent(devices[0].sharePct, 0) : "—"}
        centerLabel={devices[0]?.device ?? ""}
        height={190}
      />
    </ChartCard>
  );
}

export async function GeoCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const geo = await getGeoBreakdown(projectId, range, 8);
  const max = Math.max(1, ...geo.map((g) => g.sessions));
  return (
    <ChartCard
      title="Geography"
      description="Sessions and revenue by country"
      className="lg:col-span-7"
      action={
        <Link href="/dashboard/traffic" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      }
    >
      {geo.length === 0 ? (
        <EmptyState icon={Globe2} title="No location data" description="Geographic analytics appear once sessions are tracked." />
      ) : (
        <ul className="space-y-2.5">
          {geo.map((g) => (
            <li key={g.country} className="flex items-center gap-3 text-[13px]">
              <span className="w-32 truncate">{g.country}</span>
              <span className="relative h-4 flex-1 overflow-hidden rounded-sm bg-muted">
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 rounded-sm bg-[var(--chart-1)]"
                  style={{ width: `${(g.sessions / max) * 100}%` }}
                />
              </span>
              <span className="w-14 text-right font-medium tabular-nums">{formatCompact(g.sessions)}</span>
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

export async function BrowsersCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const browsers = await getBrowserBreakdown(projectId, range);
  return (
    <ChartCard title="Browsers" description="Sessions by browser" className="lg:col-span-5">
      <CategoryBarChart
        data={browsers.map((b) => ({ label: b.browser, value: b.sessions }))}
        horizontal
        height={210}
      />
    </ChartCard>
  );
}

export async function TopPagesCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const pages = await getTopPages(projectId, range, 8);
  return (
    <ChartCard
      title="Top pages"
      description="Most viewed pages in the selected period"
      className="lg:col-span-7"
      contentClassName="overflow-x-auto scrollbar-thin"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Page</TableHead>
            <TableHead className="text-right">Views</TableHead>
            <TableHead className="text-right">Visitors</TableHead>
            <TableHead className="hidden text-right md:table-cell">Avg. time</TableHead>
            <TableHead className="hidden text-right md:table-cell">Bounce</TableHead>
            <TableHead className="text-right">Conv.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map((p) => (
            <TableRow key={p.path}>
              <TableCell className="max-w-[220px]">
                <span className="block truncate font-medium">{p.path}</span>
                {p.title && <span className="block truncate text-xs text-muted-foreground">{p.title}</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(p.views)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(p.visitors)}</TableCell>
              <TableCell className="hidden text-right tabular-nums md:table-cell">
                {formatDuration(p.avgTimeSec)}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums md:table-cell">
                {formatPercent(p.bounceRatePct, 0)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatPercent(p.conversionRatePct)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ChartCard>
  );
}

const EVENT_LABELS: Record<string, string> = {
  signup: "signed up",
  login: "logged in",
  purchase: "made a purchase",
  checkout_started: "started checkout",
  product_view: "viewed a plan",
  subscription_created: "started a subscription",
  button_clicked: "clicked a CTA",
};

export async function ActivityCard({ projectId }: { projectId: string }) {
  const items = await getRecentActivity(projectId);
  return (
    <ChartCard
      title="Recent activity"
      description="Latest tracked events"
      className="lg:col-span-5"
      action={
        <Link href="/dashboard/events" className="text-xs font-medium text-primary hover:underline">
          All events
        </Link>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={MousePointerClick}
          title="No events tracked yet"
          description="Define events to see a live feed of what users do in your product."
        />
      ) : (
        <ol className="relative space-y-4 before:absolute before:inset-y-1 before:left-[5px] before:w-px before:bg-border">
          {items.map((item) => (
            <li key={item.id} className="relative flex items-start gap-3 pl-5">
              <span aria-hidden className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-card bg-[var(--chart-1)]" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px]">
                  <Link href={`/dashboard/users/${item.visitorId}`} className="font-medium hover:underline">
                    {item.visitorName ?? "Anonymous user"}
                  </Link>{" "}
                  <span className="text-muted-foreground">{EVENT_LABELS[item.name] ?? `fired ${item.name}`}</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                    {item.name}
                  </Badge>
                  {item.country} · {formatRelative(item.occurredAt)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </ChartCard>
  );
}
