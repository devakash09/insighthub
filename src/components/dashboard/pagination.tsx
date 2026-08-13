"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

/** URL-driven pagination — preserves every other search param. */
export function Pagination({
  page,
  pageCount,
  total,
  label = "rows",
}: {
  page: number;
  pageCount: number;
  total: number;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goTo = (target: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(target));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center justify-between gap-4 px-1">
      <p className="text-xs text-muted-foreground">
        {formatNumber(total)} {label} · page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goTo(page - 1)}>
          <ChevronLeft aria-hidden className="h-4 w-4" />
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => goTo(page + 1)}>
          Next
          <ChevronRight aria-hidden className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
