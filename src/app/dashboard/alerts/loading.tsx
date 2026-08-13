import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AlertsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-1.5 h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-9 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-1.5 h-3 w-72" />
                </div>
              </div>
              <Skeleton className="h-4 w-28" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
