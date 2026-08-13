import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Five-tile KPI skeleton matching the Users page grid. */
export function UsersKpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="gap-0 p-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="mt-2 h-7 w-24" />
          <Skeleton className="mt-2 h-3 w-28" />
        </Card>
      ))}
    </div>
  );
}

/** In-card table body skeleton shown while the visitor list streams in. */
export function UsersTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="hidden h-4 w-16 sm:block" />
          <Skeleton className="hidden h-4 w-16 md:block" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}
