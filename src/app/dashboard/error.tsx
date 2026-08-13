"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/dashboard/error-state";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-10">
      <ErrorState
        title="Unable to load this page"
        description="Something went wrong while loading your analytics. Your data is safe — try again."
        onRetry={reset}
      />
    </div>
  );
}
