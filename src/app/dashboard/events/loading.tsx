import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCardSkeleton } from "@/components/dashboard/skeletons";

export default function EventsLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="gap-0 p-4">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="mt-2 h-7 w-20" />
            <Skeleton className="mt-2 h-3 w-32" />
          </Card>
        ))}
      </div>
      <TableCardSkeleton rows={8} />
    </div>
  );
}
