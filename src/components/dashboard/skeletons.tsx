import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function KpiRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="gap-0 p-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="mt-2 h-7 w-24" />
          <Skeleton className="mt-2 h-3 w-28" />
          <Skeleton className="mt-3 h-9 w-full" />
        </Card>
      ))}
    </div>
  );
}

export function ChartCardSkeleton({ height = 280 }: { height?: number }) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton style={{ height }} className="w-full" />
      </CardContent>
    </Card>
  );
}

export function TableCardSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="hidden h-4 w-14 sm:block" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
