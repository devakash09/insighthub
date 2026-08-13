import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Users2 } from "lucide-react";
import type { DeviceType, TrafficSource, VisitorStatus } from "@prisma/client";
import { getOrgContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/rbac";
import { resolveDateRange, type DateRange } from "@/lib/date-range";
import {
  getUserKpis,
  getVisitorCountries,
  listVisitors,
  type VisitorListParams,
} from "@/lib/analytics/users";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChartCard } from "@/components/dashboard/chart-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Pagination } from "@/components/dashboard/pagination";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UsersFilters } from "@/app/dashboard/users/_components/users-filters";
import { ExportCsvButton } from "@/app/dashboard/users/_components/export-csv-button";
import { VisitorRow } from "@/app/dashboard/users/_components/visitor-row";
import { UsersKpiSkeleton, UsersTableSkeleton } from "@/app/dashboard/users/_components/users-skeletons";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type RawParams = Record<string, string | string[] | undefined>;
type SearchParams = Promise<RawParams>;

const STATUS_VALUES = ["ACTIVE", "DORMANT", "CHURNED"] as const satisfies readonly VisitorStatus[];
const DEVICE_VALUES = ["DESKTOP", "MOBILE", "TABLET"] as const satisfies readonly DeviceType[];
const SOURCE_VALUES = ["ORGANIC", "DIRECT", "SOCIAL", "REFERRAL", "PAID", "EMAIL"] as const satisfies readonly TrafficSource[];
const SORT_VALUES = ["lastSeenAt", "firstSeenAt", "sessionsCount", "totalRevenue"] as const;
const DIR_VALUES = ["asc", "desc"] as const;

type SortKey = (typeof SORT_VALUES)[number];
type SortDir = (typeof DIR_VALUES)[number];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Validate a raw param against an enum whitelist; invalid values are ignored. */
function parseEnum<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value !== undefined && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const ctx = await getOrgContext();
  const range = resolveDateRange({
    range: first(params.range),
    from: first(params.from),
    to: first(params.to),
  });

  // Cached (10 min) and needed by the always-visible filter bar, so fetched
  // outside Suspense — this keeps the search input mounted (and focused)
  // while the table section re-suspends on every filter change.
  const countries = await getVisitorCountries(ctx.project.id);

  const search = first(params.q)?.trim() || undefined;
  const sort: SortKey = parseEnum(first(params.sort), SORT_VALUES) ?? "lastSeenAt";
  const dir: SortDir = parseEnum(first(params.dir), DIR_VALUES) ?? "desc";
  const rawPage = Number.parseInt(first(params.page) ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const country = first(params.country)?.trim() || undefined;

  const listParams: VisitorListParams = {
    page,
    pageSize: PAGE_SIZE,
    search,
    sort,
    dir,
    country,
    status: parseEnum(first(params.status), STATUS_VALUES),
    device: parseEnum(first(params.device), DEVICE_VALUES),
    source: parseEnum(first(params.source), SOURCE_VALUES),
  };

  const kpiKey = `kpi-${range.from.getTime()}-${range.to.getTime()}-${ctx.project.id}`;
  const tableKey = `table-${JSON.stringify(listParams)}-${ctx.project.id}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="Everyone who has used your product"
        actions={can(ctx.role, "data.export") ? <ExportCsvButton /> : undefined}
      />

      <Suspense key={kpiKey} fallback={<UsersKpiSkeleton />}>
        <UsersKpiRow projectId={ctx.project.id} range={range} />
      </Suspense>

      <ChartCard
        title="All users"
        description="Search, filter, and sort everyone tracked in this project"
        contentClassName="space-y-3"
      >
        <UsersFilters countries={countries} />
        <Suspense key={tableKey} fallback={<UsersTableSkeleton />}>
          <UsersTable projectId={ctx.project.id} listParams={listParams} rawParams={params} />
        </Suspense>
      </ChartCard>
    </div>
  );
}

async function UsersKpiRow({ projectId, range }: { projectId: string; range: DateRange }) {
  const kpis = await getUserKpis(projectId, range);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <KpiCard label="Total users" value={formatCompact(kpis.totalUsers.current)} changePct={kpis.totalUsers.changePct} />
      <KpiCard label="New users" value={formatCompact(kpis.newUsers.current)} changePct={kpis.newUsers.changePct} />
      <KpiCard label="Returning users" value={formatCompact(kpis.returningUsers.current)} changePct={kpis.returningUsers.changePct} />
      <KpiCard label="Active users" value={formatCompact(kpis.activeUsers.current)} changePct={kpis.activeUsers.changePct} />
      <KpiCard label="Retention rate" value={formatPercent(kpis.retentionRatePct.current)} changePct={kpis.retentionRatePct.changePct} />
    </div>
  );
}

async function UsersTable({
  projectId,
  listParams,
  rawParams,
}: {
  projectId: string;
  listParams: VisitorListParams;
  rawParams: RawParams;
}) {
  const result = await listVisitors(projectId, listParams);

  if (result.total === 0) {
    return (
      <EmptyState
        icon={Users2}
        title="No users match these filters"
        description="Try broadening the search or clearing a filter — new visitors appear here as soon as they are tracked."
      />
    );
  }

  const sort = listParams.sort as SortKey;
  const dir = (listParams.dir ?? "desc") as SortDir;

  return (
    <>
      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Device</TableHead>
              <SortableHead label="First seen" sortKey="firstSeenAt" sort={sort} dir={dir} rawParams={rawParams} />
              <SortableHead label="Last active" sortKey="lastSeenAt" sort={sort} dir={dir} rawParams={rawParams} />
              <SortableHead label="Sessions" sortKey="sessionsCount" sort={sort} dir={dir} rawParams={rawParams} align="right" />
              <SortableHead label="Revenue" sortKey="totalRevenue" sort={sort} dir={dir} rawParams={rawParams} align="right" />
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((v) => (
              <VisitorRow
                key={v.id}
                visitor={{
                  id: v.id,
                  name: v.name,
                  email: v.email,
                  country: v.country,
                  device: v.device,
                  source: v.source,
                  status: v.status,
                  firstSeenAt: v.firstSeenAt,
                  lastSeenAt: v.lastSeenAt,
                  sessionsCount: v.sessionsCount,
                  totalRevenue: v.totalRevenue,
                }}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={result.page} pageCount={result.pageCount} total={result.total} label="users" />
    </>
  );
}

/**
 * Link-based sortable column header. Clicking the active column flips the
 * direction; clicking a new column sorts by it descending. Every other
 * search param (filters, range) is preserved and `page` resets.
 */
function SortableHead({
  label,
  sortKey,
  sort,
  dir,
  rawParams,
  align,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortKey;
  dir: SortDir;
  rawParams: RawParams;
  align?: "right";
}) {
  const active = sort === sortKey;
  const nextDir: SortDir = active && dir === "desc" ? "asc" : "desc";

  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    const v = first(value);
    if (v !== undefined) sp.set(key, v);
  }
  sp.set("sort", sortKey);
  sp.set("dir", nextDir);
  sp.delete("page");

  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={cn(align === "right" && "text-right")}>
      <Link
        href={`/dashboard/users?${sp.toString()}`}
        scroll={false}
        aria-label={`Sort by ${label.toLowerCase()}, ${nextDir === "asc" ? "ascending" : "descending"}`}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon aria-hidden className={cn("h-3.5 w-3.5", !active && "opacity-60")} />
      </Link>
    </TableHead>
  );
}
