import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Pagination } from "@/components/dashboard/pagination";
import { AuditActionFilter } from "./_components/audit-filter";
import { AUDIT_ACTION_PREFIXES } from "./constants";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AuditLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const ctx = await requirePermission("audit.view");

  const page = Math.max(1, Number(first(params.page)) || 1);
  const actionParam = first(params.action);
  const prefix = AUDIT_ACTION_PREFIXES.some((p) => p.value === actionParam) ? actionParam : undefined;

  const where = {
    orgId: ctx.org.id,
    ...(prefix ? { action: { startsWith: `${prefix}.` } } : {}),
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <ChartCard
        title="Audit log"
        description="Administrative and security events in this workspace."
        action={<AuditActionFilter />}
        contentClassName="overflow-x-auto scrollbar-thin"
      >
        {logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit activity yet"
            description={
              prefix
                ? "No events match this filter. Try a different category."
                : "Administrative actions like invites, role changes, and settings updates will show up here."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const details = log.metadata == null ? null : JSON.stringify(log.metadata);
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {log.actor?.name ?? log.actor?.email ?? "System"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {log.targetType ? (
                        <span>
                          {log.targetType}
                          {log.targetId && (
                            <span className="ml-1.5 font-mono">
                              {log.targetId.length > 10 ? `${log.targetId.slice(0, 10)}…` : log.targetId}
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {details ? (
                        <span
                          title={details}
                          className="block max-w-[240px] truncate font-mono text-xs text-muted-foreground"
                        >
                          {details}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm text-muted-foreground tabular-nums">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ChartCard>
      {total > 0 && <Pagination page={page} pageCount={pageCount} total={total} label="events" />}
    </div>
  );
}
