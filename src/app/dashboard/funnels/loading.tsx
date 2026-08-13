import { ChartCardSkeleton } from "@/components/dashboard/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function FunnelsLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <ChartCardSkeleton height={420} />
    </div>
  );
}
