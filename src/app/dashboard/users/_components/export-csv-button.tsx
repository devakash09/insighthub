"use client";

import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const EXPORTED_FILTERS = ["q", "status", "device", "country", "source"] as const;

/**
 * Downloads the visitor list as CSV via the export API. Rendered only for
 * roles with `data.export` (the API enforces the permission again). The
 * current filter params are carried into the export so what you see is what
 * you download.
 */
export function ExportCsvButton() {
  const searchParams = useSearchParams();
  const params = new URLSearchParams();
  for (const key of EXPORTED_FILTERS) {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  }
  const query = params.toString();

  return (
    <Button variant="outline" size="sm" asChild>
      <a href={`/api/users/export${query ? `?${query}` : ""}`} download>
        <Download aria-hidden className="h-4 w-4" />
        Export CSV
      </a>
    </Button>
  );
}
