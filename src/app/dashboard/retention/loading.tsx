import { TableCardSkeleton } from "@/components/dashboard/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function RetentionLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <TableCardSkeleton rows={8} />
    </div>
  );
}
