import { CircleDollarSign, Globe2, Package } from "lucide-react";
import {
  getRevenueByCountry,
  getRevenueByProduct,
  getRevenueBySegment,
  getRevenueTimeseries,
} from "@/lib/analytics/revenue";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { formatCurrencyCompact, formatNumber } from "@/lib/format";
import type { DateRange } from "@/lib/date-range";

export async function RevenueOverTimeCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const data = await getRevenueTimeseries(projectId, range);
  return (
    <ChartCard
      title="Revenue over time"
      description="Gross, net, and refunded revenue across the selected period"
      className="lg:col-span-8"
    >
      {data.length === 0 ? (
        <EmptyState
          icon={CircleDollarSign}
          title="No revenue in this period"
          description="Revenue trends appear here as soon as transactions are recorded in the selected period."
        />
      ) : (
        <TimeSeriesChart
          data={data as unknown as Record<string, unknown>[]}
          series={[
            { key: "gross", label: "Gross" },
            { key: "net", label: "Net" },
            { key: "refunded", label: "Refunded" },
          ]}
          type="area"
          height={300}
          granularity={range.granularity}
          format="currency"
        />
      )}
    </ChartCard>
  );
}

export async function RevenueBySegmentCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const segments = await getRevenueBySegment(projectId, range);
  const total = segments.reduce((s, x) => s + x.revenue, 0);
  return (
    <ChartCard
      title="Revenue by segment"
      description="Successful revenue by customer segment"
      className="lg:col-span-4"
    >
      {segments.length === 0 ? (
        <EmptyState
          icon={CircleDollarSign}
          title="No revenue in this period"
          description="Segment breakdowns appear once successful transactions are recorded."
        />
      ) : (
        <DonutChart
          data={segments.map((s) => ({ name: s.segment, value: s.revenue }))}
          format="currency"
          centerValue={formatCurrencyCompact(total)}
          centerLabel="revenue"
        />
      )}
    </ChartCard>
  );
}

export async function RevenueByProductCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const products = await getRevenueByProduct(projectId, range);
  const top = products.slice(0, 8);
  return (
    <ChartCard
      title="Revenue by product"
      description="Top products by successful revenue"
      className="lg:col-span-7"
    >
      {top.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No product revenue"
          description="Product breakdowns appear once successful transactions are recorded in this period."
        />
      ) : (
        <>
          <CategoryBarChart
            data={top.map((p) => ({ label: p.name, value: p.revenue }))}
            horizontal
            height={260}
            format="currency"
          />
          <ul className="mt-4 space-y-1.5 border-t pt-3">
            {top.map((p) => (
              <li
                key={p.name}
                className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
              >
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 tabular-nums">
                  {formatNumber(p.transactions)} transactions
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </ChartCard>
  );
}

export async function RevenueByCountryCard({ projectId, range }: { projectId: string; range: DateRange }) {
  const countries = await getRevenueByCountry(projectId, range);
  return (
    <ChartCard
      title="Revenue by country"
      description="Successful revenue by customer location"
      className="lg:col-span-5"
    >
      {countries.length === 0 ? (
        <EmptyState
          icon={Globe2}
          title="No revenue in this period"
          description="Country breakdowns appear once successful transactions are recorded."
        />
      ) : (
        <CategoryBarChart
          data={countries.map((c) => ({ label: c.country, value: c.revenue }))}
          horizontal
          height={300}
          format="currency"
        />
      )}
    </ChartCard>
  );
}
