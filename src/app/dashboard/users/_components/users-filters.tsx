"use client";

import { useEffect, useState } from "react";
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
import { DEVICE_LABELS, SOURCE_LABELS, STATUS_LABELS } from "@/app/dashboard/users/_components/visitor-badges";

const ALL = "all";

/**
 * URL-driven filter bar for the users table. Every control writes its value
 * into the search params (server re-renders the list) and resets `page`.
 * Unrelated params (range, sort, dir, …) are preserved.
 */
export function UsersFilters({ countries }: { countries: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(urlQ);

  // Debounced search: write ?q= 400ms after the last keystroke.
  useEffect(() => {
    if (q === (searchParams.get("q") ?? "")) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = q.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(timer);
  }, [q, pathname, router, searchParams]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const selectValue = (key: string) => searchParams.get(key) ?? ALL;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-60">
        <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, or ID"
          aria-label="Search users"
          className="h-8 pl-8 text-sm"
        />
      </div>

      <Select value={selectValue("status")} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger size="sm" aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectValue("device")} onValueChange={(v) => setParam("device", v)}>
        <SelectTrigger size="sm" aria-label="Filter by device">
          <SelectValue placeholder="Device" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All devices</SelectItem>
          {Object.entries(DEVICE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectValue("country")} onValueChange={(v) => setParam("country", v)}>
        <SelectTrigger size="sm" aria-label="Filter by country">
          <SelectValue placeholder="Country" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All countries</SelectItem>
          {countries.map((country) => (
            <SelectItem key={country} value={country}>
              {country}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectValue("source")} onValueChange={(v) => setParam("source", v)}>
        <SelectTrigger size="sm" aria-label="Filter by traffic source">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All sources</SelectItem>
          {Object.entries(SOURCE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
