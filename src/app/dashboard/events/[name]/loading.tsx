import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCardSkeleton, TableCardSkeleton } from "@/components/dashboard/skeletons";

export default function EventDetailLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="mt-2 h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="gap-0 p-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-2 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ChartCardSkeleton height={300} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-4">
          <ChartCardSkeleton height={120} />
          <ChartCardSkeleton height={120} />
        </div>
        <div className="lg:col-span-12">
          <TableCardSkeleton rows={6} />
        </div>
      </div>
    </div>
  );
}
