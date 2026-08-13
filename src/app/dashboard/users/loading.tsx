import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersKpiSkeleton, UsersTableSkeleton } from "@/app/dashboard/users/_components/users-skeletons";

export default function UsersLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>

      <UsersKpiSkeleton />

      <Card className="gap-4">
        <CardHeader>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-full sm:w-60" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-28" />
          </div>
          <UsersTableSkeleton rows={10} />
        </CardContent>
      </Card>
    </div>
  );
}
