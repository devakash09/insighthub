import { Skeleton } from "@/components/ui/skeleton";
import { TableCardSkeleton } from "@/components/dashboard/skeletons";

export default function ReportsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-1.5 h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <TableCardSkeleton rows={6} />
    </div>
  );
}
