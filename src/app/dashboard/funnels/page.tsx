import { Suspense } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth/context";
import { resolveDateRange, type DateRange } from "@/lib/date-range";
import { computeFunnel, DEFAULT_FUNNEL_STEPS } from "@/lib/analytics/funnels";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChartCardSkeleton } from "@/components/dashboard/skeletons";
import { FunnelBuilder } from "@/app/dashboard/funnels/_components/funnel-builder";

export const metadata: Metadata = { title: "Funnels" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function FunnelsPage({ searchParams }: { searchParams: SearchParams }) {
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
      <PageHeader title="Funnels" description="Where users drop off between key steps" />
      <Suspense key={suspenseKey} fallback={<ChartCardSkeleton height={420} />}>
        <FunnelSection projectId={ctx.project.id} range={range} />
      </Suspense>
    </div>
  );
}

async function FunnelSection({ projectId, range }: { projectId: string; range: DateRange }) {
  const [definitions, initialStages] = await Promise.all([
    db.eventDefinition.findMany({
      where: { projectId },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    computeFunnel(projectId, range, DEFAULT_FUNNEL_STEPS),
  ]);

  return (
    <FunnelBuilder
      eventNames={definitions.map((d) => d.name)}
      initialSteps={DEFAULT_FUNNEL_STEPS}
      initialStages={initialStages}
    />
  );
}
