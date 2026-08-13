"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Polished inline error with a retry affordance. */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data. Try again in a moment.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle aria-hidden className="h-5 w-5 text-destructive" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry ?? (() => router.refresh())}>
        <RotateCw aria-hidden className="h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  );
}
