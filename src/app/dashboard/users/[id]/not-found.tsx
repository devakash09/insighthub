import Link from "next/link";
import { ChevronLeft, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UserNotFound() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <UserX aria-hidden className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">User not found</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          This user doesn&apos;t exist in the current project. They may have been removed, or the link
          you followed is out of date.
        </p>
        <Button variant="outline" size="sm" className="mt-5" asChild>
          <Link href="/dashboard/users">
            <ChevronLeft aria-hidden className="h-4 w-4" />
            Back to all users
          </Link>
        </Button>
      </div>
    </div>
  );
}
