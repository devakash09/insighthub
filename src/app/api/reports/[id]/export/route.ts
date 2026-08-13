import { db } from "@/lib/db";
import { withErrorHandling, badRequest, notFound } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { reportConfigSchema, type ReportConfig } from "@/lib/validations/analytics";
import { runReport } from "@/lib/analytics/reports";
import { resolveDateRange } from "@/lib/date-range";
import { toCsv, csvResponse } from "@/lib/csv";
import { recordAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

const METRIC_LABELS: Record<ReportConfig["metric"], string> = {
  users: "Users",
  sessions: "Sessions",
  page_views: "Page views",
  revenue: "Revenue",
  conversions: "Conversions",
  events: "Events",
};

const DIMENSION_LABELS: Record<ReportConfig["dimension"], string> = {
  date: "Date",
  country: "Country",
  device: "Device",
  browser: "Browser",
  source: "Source",
  page: "Page",
};

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "report"
  );
}

export const GET = withErrorHandling<RouteContext>(async (req, { params }) => {
  const { id } = await params;
  const ctx = await getApiContext("data.export");

  const report = await db.savedReport.findUnique({ where: { id } });
  if (!report || report.orgId !== ctx.org.id) throw notFound("Report not found");

  const parsed = reportConfigSchema.safeParse(report.config);
  if (!parsed.success) throw badRequest("This report's configuration is invalid and cannot be run");

  const url = new URL(req.url);
  const range = resolveDateRange({
    range: url.searchParams.get("range") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const result = await runReport(report.projectId ?? ctx.project.id, range, parsed.data);

  const csv = toCsv(
    [DIMENSION_LABELS[result.dimension], METRIC_LABELS[result.metric]],
    result.rows.map((row) => [row.label, row.value]),
  );

  await db.savedReport.update({ where: { id }, data: { lastRunAt: new Date() } });

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "report.exported",
    targetType: "report",
    targetId: id,
    metadata: { range: range.key },
  });

  const filename = `report-${slugify(report.name)}-${new Date().toISOString().slice(0, 10)}.csv`;
  return csvResponse(filename, csv);
});
