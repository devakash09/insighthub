"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "succeeded", label: "Succeeded" },
  { value: "pending", label: "Pending" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
] as const;

/**
 * URL-driven transaction filters: a status select (?status=) and a debounced
 * search input (?q=). Both reset ?page= so the list starts from page 1.
 */
export function TransactionsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const apply = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q.trim() === current) return;
    const timer = setTimeout(() => apply({ q: q.trim() || null }), 350);
    return () => clearTimeout(timer);
  }, [q, searchParams, apply]);

  const statusParam = (searchParams.get("status") ?? "all").toLowerCase();
  const status = STATUS_OPTIONS.some((o) => o.value === statusParam) ? statusParam : "all";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customer, product, or ID"
          aria-label="Search transactions"
          className="h-8 w-52 pl-8 text-xs"
        />
      </div>
      <Select value={status} onValueChange={(v) => apply({ status: v === "all" ? null : v })}>
        <SelectTrigger size="sm" className="text-xs" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
