import { Suspense } from "react";
import type { Metadata } from "next";
import type { TransactionStatus } from "@prisma/client";
import { getOrgContext } from "@/lib/auth/context";
import { resolveDateRange } from "@/lib/date-range";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChartCard } from "@/components/dashboard/chart-card";
import { KpiRowSkeleton, ChartCardSkeleton } from "@/components/dashboard/skeletons";
import { RevenueKpis } from "@/app/dashboard/revenue/_components/revenue-kpis";
import {
  RevenueByCountryCard,
  RevenueByProductCard,
  RevenueBySegmentCard,
  RevenueOverTimeCard,
} from "@/app/dashboard/revenue/_components/revenue-cards";
import { TransactionsFilters } from "@/app/dashboard/revenue/_components/transactions-filters";
import {
  TransactionsTable,
  TransactionsTableSkeleton,
} from "@/app/dashboard/revenue/_components/transactions-table";

export const metadata: Metadata = { title: "Revenue" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const STATUS_VALUES: TransactionStatus[] = ["SUCCEEDED", "PENDING", "REFUNDED", "FAILED"];

export default async function RevenuePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const ctx = await getOrgContext();
  const range = resolveDateRange({
    range: first(params.range),
    from: first(params.from),
    to: first(params.to),
  });

  const statusRaw = first(params.status)?.toUpperCase();
  const status = STATUS_VALUES.find((s) => s === statusRaw);
  const search = first(params.q)?.trim() || undefined;
  const pageRaw = Number.parseInt(first(params.page) ?? "", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const suspenseKey = `${range.from.getTime()}-${range.to.getTime()}-${ctx.project.id}`;
  const txKey = `tx-${suspenseKey}-${status ?? "all"}-${search ?? ""}-${page}`;

  return (
    <div className="space-y-4">
      <PageHeader title="Revenue" description="Recurring revenue, transactions, and refunds" />

      <Suspense key={`kpi-${suspenseKey}`} fallback={<KpiRowSkeleton />}>
        <RevenueKpis projectId={ctx.project.id} range={range} />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Suspense
          key={`ts-${suspenseKey}`}
          fallback={
            <div className="lg:col-span-8">
              <ChartCardSkeleton height={300} />
            </div>
          }
        >
          <RevenueOverTimeCard projectId={ctx.project.id} range={range} />
        </Suspense>
        <Suspense
          key={`seg-${suspenseKey}`}
          fallback={
            <div className="lg:col-span-4">
              <ChartCardSkeleton height={220} />
            </div>
          }
        >
          <RevenueBySegmentCard projectId={ctx.project.id} range={range} />
        </Suspense>

        <Suspense
          key={`prod-${suspenseKey}`}
          fallback={
            <div className="lg:col-span-7">
              <ChartCardSkeleton height={260} />
            </div>
          }
        >
          <RevenueByProductCard projectId={ctx.project.id} range={range} />
        </Suspense>
        <Suspense
          key={`geo-${suspenseKey}`}
          fallback={
            <div className="lg:col-span-5">
              <ChartCardSkeleton height={300} />
            </div>
          }
        >
          <RevenueByCountryCard projectId={ctx.project.id} range={range} />
        </Suspense>

        <ChartCard
          title="Transactions"
          description="Individual payments in the selected period"
          className="lg:col-span-12"
          action={<TransactionsFilters />}
          contentClassName="overflow-x-auto scrollbar-thin"
        >
          <Suspense key={txKey} fallback={<TransactionsTableSkeleton />}>
            <TransactionsTable
              projectId={ctx.project.id}
              range={range}
              page={page}
              status={status}
              search={search}
            />
          </Suspense>
        </ChartCard>
      </div>
    </div>
  );
}
