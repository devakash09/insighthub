import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe2, MonitorSmartphone, MousePointerClick } from "lucide-react";
import { getOrgContext } from "@/lib/auth/context";
import { getEventDetail } from "@/lib/analytics/events";
import { DEVICE_LABELS } from "@/lib/analytics/devices";
import { SOURCE_LABELS } from "@/lib/analytics/traffic";
import { resolveDateRange, rangeToParams } from "@/lib/date-range";
import { formatCompact, formatDateTime, formatPercent } from "@/lib/format";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

type Params = Promise<{ name: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { name } = await params;
  return { title: decodeURIComponent(name) };
}

function StatCard({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <Card className="gap-0 p-4">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
    </Card>
  );
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ name: rawName }, sp] = await Promise.all([params, searchParams]);
  const name = decodeURIComponent(rawName);
  const ctx = await getOrgContext();
  const range = resolveDateRange({
    range: first(sp.range),
    from: first(sp.from),
    to: first(sp.to),
  });

  const detail = await getEventDetail(ctx.project.id, name, range);
  if (!detail) notFound();

  const { definition, count, uniqueUsers, reachPct, trend, recent, byDevice, bySource } = detail;
  const rangeQs = new URLSearchParams(rangeToParams(range)).toString();
  const avgPerUser = uniqueUsers === 0 ? "—" : (count / uniqueUsers).toFixed(1);

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/dashboard/events?${rangeQs}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
          All events
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-xl font-semibold tracking-tight">{definition.name}</h1>
          {definition.isConversion && <Badge variant="secondary">Conversion</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {definition.description ?? `Tracked occurrences of ${definition.name}`} · {range.label.toLowerCase()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total count" value={formatCompact(count)} caption={range.label.toLowerCase()} />
        <StatCard label="Unique users" value={formatCompact(uniqueUsers)} caption="fired at least once" />
        <StatCard label="Reach" value={formatPercent(reachPct)} caption="of active users in period" />
        <StatCard label="Avg per user" value={avgPerUser} caption="events per unique user" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <ChartCard
          title="Trend"
          description="Events and unique users per period"
          className="lg:col-span-8"
        >
          {trend.length === 0 ? (
            <EmptyState
              icon={MousePointerClick}
              title="No occurrences in this period"
              description="This event was not fired in the selected date range."
            />
          ) : (
            <TimeSeriesChart
              data={trend as unknown as Record<string, unknown>[]}
              series={[
                { key: "count", label: "Events" },
                { key: "uniqueUsers", label: "Unique users" },
              ]}
              type="line"
              height={300}
              granularity={range.granularity}
            />
          )}
        </ChartCard>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <ChartCard title="By device" description="Occurrences by device class">
            {byDevice.length === 0 ? (
              <EmptyState
                icon={MonitorSmartphone}
                title="No device data"
                description="Device breakdown appears once the event is fired."
              />
            ) : (
              <CategoryBarChart
                data={byDevice.map((d) => ({ label: DEVICE_LABELS[d.device] ?? d.device, value: d.count }))}
                horizontal
                height={Math.max(120, byDevice.length * 40)}
              />
            )}
          </ChartCard>

          <ChartCard title="By source" description="Occurrences by acquisition channel">
            {bySource.length === 0 ? (
              <EmptyState
                icon={Globe2}
                title="No source data"
                description="Source breakdown appears once the event is fired."
              />
            ) : (
              <CategoryBarChart
                data={bySource.map((s) => ({ label: SOURCE_LABELS[s.source] ?? s.source, value: s.count }))}
                horizontal
                height={Math.max(120, bySource.length * 36)}
              />
            )}
          </ChartCard>
        </div>

        <ChartCard
          title="Recent occurrences"
          description="Latest times this event was fired"
          className="lg:col-span-12"
          contentClassName="overflow-x-auto scrollbar-thin"
        >
          {recent.length === 0 ? (
            <EmptyState
              icon={MousePointerClick}
              title="No occurrences in this period"
              description="Occurrences will appear here as soon as this event is fired again."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((e) => {
                  const meta = e.metadata === null ? null : JSON.stringify(e.metadata);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDateTime(e.occurredAt)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/users/${e.visitorId}`} className="font-medium hover:underline">
                          {e.visitor.name ?? "Anonymous"}
                        </Link>
                      </TableCell>
                      <TableCell>{e.visitor.country}</TableCell>
                      <TableCell className="max-w-[320px]">
                        {meta ? (
                          <span className="block truncate font-mono text-xs text-muted-foreground" title={meta}>
                            {meta}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
