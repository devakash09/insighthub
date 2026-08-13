import { ChartCardSkeleton, TableCardSkeleton } from "@/components/dashboard/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function TrafficLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ChartCardSkeleton height={300} />
        </div>
        <div className="lg:col-span-4">
          <ChartCardSkeleton height={220} />
        </div>
        <div className="lg:col-span-12">
          <TableCardSkeleton />
        </div>
        <div className="lg:col-span-6">
          <ChartCardSkeleton height={320} />
        </div>
        <div className="lg:col-span-3">
          <ChartCardSkeleton height={320} />
        </div>
        <div className="lg:col-span-3">
          <ChartCardSkeleton height={320} />
        </div>
        <div className="lg:col-span-4">
          <ChartCardSkeleton height={190} />
        </div>
        <div className="lg:col-span-4">
          <ChartCardSkeleton height={210} />
        </div>
        <div className="lg:col-span-4">
          <ChartCardSkeleton height={210} />
        </div>
      </div>
    </div>
  );
}
