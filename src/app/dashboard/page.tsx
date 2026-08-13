import { Suspense } from "react";
import type { Metadata } from "next";
import { getOrgContext } from "@/lib/auth/context";
import { resolveDateRange, type Granularity } from "@/lib/date-range";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiRowSkeleton, ChartCardSkeleton, TableCardSkeleton } from "@/components/dashboard/skeletons";
import { KpiRow } from "@/app/dashboard/_components/kpi-row";
import {
  ActivityCard,
  BrowsersCard,
  DevicesCard,
  GeoCard,
  RevenueCard,
  TopPagesCard,
  TrafficSourcesCard,
  UserGrowthCard,
} from "@/app/dashboard/_components/overview-cards";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function OverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const ctx = await getOrgContext();
  const range = resolveDateRange({
    range: first(params.range),
    from: first(params.from),
    to: first(params.to),
  });
  const g = first(params.g);
  const granularity: Granularity =
    g === "week" || g === "month" ? g : g === "day" ? "day" : range.granularity;
  const suspenseKey = `${range.from.getTime()}-${range.to.getTime()}-${ctx.project.id}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Overview"
        description={`${ctx.org.name} · ${ctx.project.name} · ${range.label.toLowerCase()}`}
      />

      <Suspense key={suspenseKey} fallback={<KpiRowSkeleton />}>
        <KpiRow projectId={ctx.project.id} range={range} />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Suspense key={`rev-${suspenseKey}-${granularity}`} fallback={<ChartCardSkeleton height={300} />}>
          <RevenueCard projectId={ctx.project.id} range={range} granularity={granularity} />
        </Suspense>
        <Suspense key={`src-${suspenseKey}`} fallback={<ChartCardSkeleton height={220} />}>
          <TrafficSourcesCard projectId={ctx.project.id} range={range} />
        </Suspense>

        <Suspense key={`growth-${suspenseKey}`} fallback={<ChartCardSkeleton height={260} />}>
          <UserGrowthCard projectId={ctx.project.id} range={range} />
        </Suspense>
        <Suspense key={`dev-${suspenseKey}`} fallback={<ChartCardSkeleton height={190} />}>
          <DevicesCard projectId={ctx.project.id} range={range} />
        </Suspense>

        <Suspense key={`geo-${suspenseKey}`} fallback={<ChartCardSkeleton height={260} />}>
          <GeoCard projectId={ctx.project.id} range={range} />
        </Suspense>
        <Suspense key={`brow-${suspenseKey}`} fallback={<ChartCardSkeleton height={210} />}>
          <BrowsersCard projectId={ctx.project.id} range={range} />
        </Suspense>

        <Suspense key={`pages-${suspenseKey}`} fallback={<TableCardSkeleton />}>
          <TopPagesCard projectId={ctx.project.id} range={range} />
        </Suspense>
        <Suspense key={`act-${suspenseKey}`} fallback={<TableCardSkeleton rows={5} />}>
          <ActivityCard projectId={ctx.project.id} />
        </Suspense>
      </div>
    </div>
  );
}
