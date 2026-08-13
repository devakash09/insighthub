"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIT_ACTION_PREFIXES } from "../constants";

/** URL-driven action-category filter for the audit log table. */
export function AuditActionFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get("action") ?? "all";

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("action");
    else params.set("action", next);
    params.delete("page"); // reset pagination when the filter changes
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-36" aria-label="Filter by action">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All actions</SelectItem>
        {AUDIT_ACTION_PREFIXES.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
