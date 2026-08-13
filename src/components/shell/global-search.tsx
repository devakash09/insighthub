"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, MousePointerClick, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface SearchResult {
  type: "user" | "report" | "event" | "page";
  label: string;
  sublabel?: string;
  href: string;
}

const TYPE_ICON = { user: User, report: FileText, event: MousePointerClick, page: Search } as const;
const TYPE_LABEL = { user: "Users", report: "Reports", event: "Events", page: "Pages" } as const;

/** Cmd/Ctrl+K search across users, reports, events, and pages. */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const runSearch = useCallback((q: string) => {
    abortRef.current?.abort();
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((data) => {
        setResults(data.results ?? []);
        setSearched(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 250);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 w-8 justify-center gap-2 px-0 text-muted-foreground sm:w-52 sm:justify-start sm:px-3"
        aria-label="Search"
      >
        <Search aria-hidden className="h-3.5 w-3.5" />
        <span className="hidden text-xs font-normal sm:inline">Search…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
          Ctrl K
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
          <DialogTitle className="sr-only">Global search</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3">
            {loading ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Search aria-hidden className="h-4 w-4 text-muted-foreground" />
            )}
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users, reports, events, pages…"
              className="h-11 border-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
            {searched && results.length === 0 && !loading ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No results for &ldquo;{query.trim()}&rdquo;
              </p>
            ) : results.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search this workspace.
              </p>
            ) : (
              Object.entries(grouped).map(([type, items]) => (
                <div key={type} className="mb-1">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {TYPE_LABEL[type as keyof typeof TYPE_LABEL]}
                  </p>
                  {items.map((r) => {
                    const Icon = TYPE_ICON[r.type];
                    return (
                      <button
                        key={`${r.type}-${r.href}-${r.label}`}
                        onClick={() => go(r.href)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                      >
                        <Icon aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium">{r.label}</span>
                          {r.sublabel && (
                            <span className="block truncate text-[11px] text-muted-foreground">{r.sublabel}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
