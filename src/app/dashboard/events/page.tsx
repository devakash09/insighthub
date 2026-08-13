import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus, MousePointerClick } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/rbac";
import { listEventSummaries } from "@/lib/analytics/events";
import { resolveDateRange, rangeToParams, type DateRange } from "@/lib/date-range";
import { formatCompact, formatDelta } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { TableCardSkeleton } from "@/components/dashboard/skeletons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewEventDialog } from "@/app/dashboard/events/_components/new-event-dialog";
import { EventRowActions } from "@/app/dashboard/events/_components/event-row-actions";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
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

async function EventsSummary({ projectId, range }: { projectId: string; range: DateRange }) {
  const summaries = await listEventSummaries(projectId, range);
  const totalTracked = summaries.reduce((s, e) => s + e.count, 0);
  const activeTypes = summaries.filter((e) => e.count > 0).length;
  const conversionDefs = summaries.filter((e) => e.isConversion).length;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard label="Total events tracked" value={formatCompact(totalTracked)} caption={range.label.toLowerCase()} />
      <StatCard label="Active event types" value={formatCompact(activeTypes)} caption={`of ${summaries.length} defined`} />
      <StatCard label="Conversion events" value={formatCompact(conversionDefs)} caption="definitions marked as conversions" />
    </div>
  );
}

function TrendCell({ trendPct }: { trendPct: number | null }) {
  if (trendPct === null) return <span className="text-muted-foreground">—</span>;
  const direction = Math.abs(trendPct) < 0.05 ? "flat" : trendPct > 0 ? "up" : "down";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums",
        direction === "up" && "text-success",
        direction === "down" && "text-destructive",
        direction === "flat" && "text-muted-foreground",
      )}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {formatDelta(trendPct)}
    </span>
  );
}

async function EventsTable({
  projectId,
  range,
  canManage,
}: {
  projectId: string;
  range: DateRange;
  canManage: boolean;
}) {
  const [summaries, definitions] = await Promise.all([
    listEventSummaries(projectId, range),
    db.eventDefinition.findMany({ where: { projectId }, select: { id: true, name: true } }),
  ]);
  const idByName = new Map(definitions.map((d) => [d.name, d.id]));
  const rangeQs = new URLSearchParams(rangeToParams(range)).toString();

  return (
    <ChartCard
      title="All events"
      description="Tracked events in the selected period, compared with the previous one"
      contentClassName="overflow-x-auto scrollbar-thin"
    >
      {summaries.length === 0 ? (
        <EmptyState
          icon={MousePointerClick}
          title="No events tracked yet"
          description="Define your first event to start measuring what users do."
          action={canManage ? <NewEventDialog /> : undefined}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Conversion</TableHead>
              <TableHead className="text-right">Count</TableHead>
              <TableHead className="text-right">Unique users</TableHead>
              <TableHead className="text-right">Trend</TableHead>
              {canManage && (
                <TableHead className="w-10 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((s) => {
              const definitionId = idByName.get(s.name);
              return (
                <TableRow key={s.name}>
                  <TableCell className="max-w-[280px]">
                    <Link
                      href={`/dashboard/events/${encodeURIComponent(s.name)}?${rangeQs}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {s.name}
                    </Link>
                    {s.description && (
                      <span className="block truncate text-xs text-muted-foreground">{s.description}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.isConversion && (
                      <Badge variant="outline" className="text-[11px] font-normal">
                        Conversion
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCompact(s.count)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCompact(s.uniqueUsers)}</TableCell>
                  <TableCell className="text-right">
                    <TrendCell trendPct={s.trendPct} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {definitionId && <EventRowActions definitionId={definitionId} name={s.name} />}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </ChartCard>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="gap-0 p-4">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="mt-2 h-7 w-20" />
          <Skeleton className="mt-2 h-3 w-32" />
        </Card>
      ))}
    </div>
  );
}

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const ctx = await getOrgContext();
  const range = resolveDateRange({
    range: first(params.range),
    from: first(params.from),
    to: first(params.to),
  });
  const canManage = can(ctx.role, "events.manage");
  const suspenseKey = `${range.from.getTime()}-${range.to.getTime()}-${ctx.project.id}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Events"
        description="Define and monitor product events"
        actions={canManage ? <NewEventDialog /> : undefined}
      />

      <Suspense key={`summary-${suspenseKey}`} fallback={<SummarySkeleton />}>
        <EventsSummary projectId={ctx.project.id} range={range} />
      </Suspense>

      <Suspense key={`table-${suspenseKey}`} fallback={<TableCardSkeleton rows={8} />}>
        <EventsTable projectId={ctx.project.id} range={range} canManage={canManage} />
      </Suspense>
    </div>
  );
}
