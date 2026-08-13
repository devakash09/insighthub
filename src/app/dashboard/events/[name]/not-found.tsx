import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";

export default function EventNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Event not found"
      description="This event does not exist in the current project, or its definition was deleted."
      action={
        <Button asChild size="sm">
          <Link href="/dashboard/events">Back to all events</Link>
        </Button>
      }
    />
  );
}
