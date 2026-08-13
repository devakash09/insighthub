import { Suspense } from "react";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { getOrgContext } from "@/lib/auth/context";
import { getWeeklyCohorts } from "@/lib/analytics/retention";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { TableCardSkeleton } from "@/components/dashboard/skeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompact, formatDate, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Retention" };
export const dynamic = "force-dynamic";

const WEEKS = 8;

export default async function RetentionPage() {
  const ctx = await getOrgContext();

  return (
    <div className="space-y-4">
      <PageHeader title="Retention" description="Weekly cohorts and how well they come back" />
      <Suspense key={ctx.project.id} fallback={<TableCardSkeleton rows={WEEKS} />}>
        <CohortHeatmap projectId={ctx.project.id} />
      </Suspense>
    </div>
  );
}

async function CohortHeatmap({ projectId }: { projectId: string }) {
  const cohorts = await getWeeklyCohorts(projectId, WEEKS);

  return (
    <ChartCard
      title="Weekly cohorts"
      description="Each row is the group of users who first appeared that week; each cell shows how many returned in the following weeks."
      contentClassName="overflow-x-auto scrollbar-thin"
    >
      {cohorts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No cohorts yet"
          description="Retention appears once visitors have been tracked for at least a week."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Cohort</TableHead>
                {Array.from({ length: WEEKS }, (_, i) => (
                  <TableHead key={i} className="min-w-[64px] text-center">
                    Week {i}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.map((cohort) => (
                <TableRow key={cohort.cohortStart} className="hover:bg-transparent">
                  <TableCell>
                    <span className="block text-[13px] font-medium">
                      Week of {formatDate(cohort.cohortStart)}
                    </span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {formatCompact(cohort.size)} users
                    </span>
                  </TableCell>
                  {Array.from({ length: WEEKS }, (_, i) => {
                    const pct = i === 0 ? (cohort.retention[0] === null ? null : 100) : cohort.retention[i];
                    if (pct === null) {
                      return (
                        <TableCell key={i} className="text-center text-xs text-muted-foreground">
                          —
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell
                        key={i}
                        className="text-center text-xs font-medium tabular-nums"
                        style={{
                          background: `color-mix(in oklab, var(--chart-1) ${Math.round(pct)}%, transparent)`,
                          color: pct > 55 ? "#fff" : undefined,
                        }}
                      >
                        {formatPercent(pct, 0)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>0%</span>
            <span
              aria-hidden
              className="h-2 w-36 rounded-sm"
              style={{
                background:
                  "linear-gradient(to right, color-mix(in oklab, var(--chart-1) 0%, transparent), var(--chart-1))",
              }}
            />
            <span>100%</span>
            <span className="ml-2">share of the cohort active that week</span>
          </div>
        </>
      )}
    </ChartCard>
  );
}
