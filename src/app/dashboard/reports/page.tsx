import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/rbac";
import { reportConfigSchema, type ReportConfig } from "@/lib/validations/analytics";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportActions } from "@/app/dashboard/reports/_components/report-actions";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const METRIC_LABELS: Record<ReportConfig["metric"], string> = {
  users: "Users",
  sessions: "Sessions",
  page_views: "Page views",
  revenue: "Revenue",
  conversions: "Conversions",
  events: "Events",
};

const DIMENSION_LABELS: Record<ReportConfig["dimension"], string> = {
  date: "By date",
  country: "By country",
  device: "By device",
  browser: "By browser",
  source: "By source",
  page: "By page",
};

const SCHEDULE_LABELS: Record<string, string> = {
  NONE: "None",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const highlight = first(params.highlight);
  const ctx = await getOrgContext();

  const reports = await db.savedReport.findMany({
    where: { orgId: ctx.org.id },
    orderBy: { updatedAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  const canManage = can(ctx.role, "reports.manage");
  const canExport = can(ctx.role, "data.export");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Saved and scheduled report definitions"
        actions={
          <Button asChild size="sm">
            <Link href="/dashboard/analytics">
              <Plus aria-hidden />
              New report
            </Link>
          </Button>
        }
      />

      {reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Build a report in Analytics and save it here for the whole team."
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/analytics">
                <Plus aria-hidden />
                New report
              </Link>
            </Button>
          }
        />
      ) : (
        <ChartCard
          title="All reports"
          description={`${reports.length} saved ${reports.length === 1 ? "report" : "reports"}`}
          contentClassName="overflow-x-auto scrollbar-thin"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Config</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const parsed = reportConfigSchema.safeParse(report.config);
                return (
                  <TableRow
                    key={report.id}
                    className={cn(highlight === report.id && "ring-2 ring-primary/40")}
                  >
                    <TableCell className="max-w-64">
                      <p className="truncate font-medium">{report.name}</p>
                      {report.description && (
                        <p className="truncate text-xs text-muted-foreground">{report.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {parsed.success ? (
                        <span className="flex items-center gap-1.5">
                          <Badge variant="outline">{METRIC_LABELS[parsed.data.metric]}</Badge>
                          <span aria-hidden className="text-muted-foreground">
                            &middot;
                          </span>
                          <Badge variant="outline">{DIMENSION_LABELS[parsed.data.dimension]}</Badge>
                        </span>
                      ) : (
                        <Badge variant="destructive">Invalid config</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{SCHEDULE_LABELS[report.schedule] ?? "None"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.lastRunAt ? formatRelative(report.lastRunAt) : "Never"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.createdBy?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatRelative(report.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <ReportActions
                        report={{
                          id: report.id,
                          name: report.name,
                          description: report.description,
                          schedule: report.schedule,
                        }}
                        canManage={canManage}
                        canExport={canExport}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ChartCard>
      )}
    </div>
  );
}
