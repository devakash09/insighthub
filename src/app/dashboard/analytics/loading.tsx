import { ChartCardSkeleton } from "@/components/dashboard/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <ChartCardSkeleton height={380} />
        </div>
        <div className="lg:col-span-8">
          <ChartCardSkeleton height={380} />
        </div>
      </div>
    </div>
  );
}
