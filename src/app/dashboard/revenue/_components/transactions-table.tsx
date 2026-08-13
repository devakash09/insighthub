import Link from "next/link";
import { Receipt } from "lucide-react";
import type { TransactionStatus, TransactionType } from "@prisma/client";
import { listTransactions } from "@/lib/analytics/revenue";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Pagination } from "@/components/dashboard/pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { DateRange } from "@/lib/date-range";

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<TransactionType, string> = {
  ONE_TIME: "One-time",
  SUBSCRIPTION: "Subscription",
  RENEWAL: "Renewal",
};

const STATUS_LABELS: Record<TransactionStatus, string> = {
  SUCCEEDED: "Succeeded",
  PENDING: "Pending",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

function StatusBadge({ status }: { status: TransactionStatus }) {
  if (status === "SUCCEEDED") {
    return (
      <Badge variant="outline" className="border-transparent bg-success/10 text-success">
        {STATUS_LABELS.SUCCEEDED}
      </Badge>
    );
  }
  const variant = status === "PENDING" ? "secondary" : status === "REFUNDED" ? "outline" : "destructive";
  return <Badge variant={variant}>{STATUS_LABELS[status]}</Badge>;
}

export async function TransactionsTable({
  projectId,
  range,
  page,
  status,
  search,
}: {
  projectId: string;
  range: DateRange;
  page: number;
  status?: TransactionStatus;
  search?: string;
}) {
  const result = await listTransactions(projectId, {
    page,
    pageSize: PAGE_SIZE,
    status,
    search,
    from: range.from,
    to: range.to,
  });

  if (result.total === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No transactions in this period"
        description="Try widening the date range, or clearing the status and search filters."
      />
    );
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="max-w-[140px]">
                <span title={t.id} className="block truncate font-mono text-xs">
                  {t.id}
                </span>
              </TableCell>
              <TableCell className="max-w-[200px]">
                {t.visitor ? (
                  <>
                    <Link
                      href={`/dashboard/users/${t.visitor.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {t.visitor.name ?? "—"}
                    </Link>
                    {t.visitor.email && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.visitor.email}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="max-w-[180px]">
                <span className="block truncate">{t.product.name}</span>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatCurrency(t.amount, { cents: true })}
              </TableCell>
              <TableCell className="text-muted-foreground">{t.currency}</TableCell>
              <TableCell>
                <Badge variant="outline">{TYPE_LABELS[t.type]}</Badge>
              </TableCell>
              <TableCell>
                <StatusBadge status={t.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-right text-muted-foreground tabular-nums">
                {formatDateTime(t.occurredAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        label="transactions"
      />
    </div>
  );
}

export function TransactionsTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="hidden h-4 w-16 sm:block" />
          <Skeleton className="hidden h-4 w-20 md:block" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
