import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCardSkeleton } from "@/components/dashboard/skeletons";

export default function UserDetailLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-4 w-20" />
        <div className="mt-3 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-6 w-44" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="gap-0 p-4">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="mt-2 h-6 w-16" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <TableCardSkeleton rows={7} />
        </div>
        <div className="lg:col-span-5">
          <TableCardSkeleton rows={6} />
        </div>
        <div className="lg:col-span-7">
          <TableCardSkeleton rows={6} />
        </div>
        <div className="lg:col-span-5">
          <TableCardSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}
