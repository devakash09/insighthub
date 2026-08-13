import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/rbac";
import { getVisitorCountries } from "@/lib/analytics/users";
import { reportConfigSchema, type ReportConfig } from "@/lib/validations/analytics";
import { PageHeader } from "@/components/dashboard/page-header";
import { ReportBuilder } from "@/app/dashboard/analytics/_components/report-builder";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const DEFAULT_CONFIG: ReportConfig = {
  metric: "sessions",
  dimension: "date",
  chart: "line",
  filters: {},
};

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const ctx = await getOrgContext();
  const reportId = first(params.report);

  const [countries, eventDefinitions] = await Promise.all([
    getVisitorCountries(ctx.project.id),
    db.eventDefinition.findMany({
      where: { projectId: ctx.project.id },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
  ]);

  let initialConfig = DEFAULT_CONFIG;
  if (reportId) {
    const saved = await db.savedReport.findFirst({ where: { id: reportId, orgId: ctx.org.id } });
    if (saved) {
      const parsed = reportConfigSchema.safeParse(saved.config);
      if (parsed.success) initialConfig = parsed.data;
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Analytics" description="Build custom reports from your analytics data" />
      <ReportBuilder
        key={reportId ?? "new"}
        countries={countries}
        eventNames={eventDefinitions.map((e) => e.name)}
        canSave={can(ctx.role, "reports.create")}
        initialConfig={initialConfig}
      />
    </div>
  );
}
