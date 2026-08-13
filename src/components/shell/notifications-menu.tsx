"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, CheckCheck, FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const TYPE_ICON: Record<string, typeof Info> = { alert: BellRing, report: FileText, info: Info };

export function NotificationsMenu({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [unread, setUnread] = useState(initialUnread);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      setItems([]);
    }
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && items === null) void load();
  };

  const markAllRead = async () => {
    setUnread(0);
    setItems((prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => {});
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
          <Bell aria-hidden className="h-4 w-4" />
          {unread > 0 && (
            <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAllRead}>
              <CheckCheck aria-hidden className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {items === null ? (
            <div className="space-y-3 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-2.5">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            items.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Info;
              const inner = (
                <div className={cn("flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-accent", !n.readAt && "bg-primary/[0.04]")}>
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block truncate text-[13px]", !n.readAt && "font-medium")}>{n.title}</span>
                    {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>}
                    <span className="mt-0.5 block text-[11px] text-muted-foreground/70">{formatRelative(n.createdAt)}</span>
                  </span>
                  {!n.readAt && <span aria-hidden className="ml-auto mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block border-b last:border-0">
                  {inner}
                </Link>
              ) : (
                <div key={n.id} className="border-b last:border-0">
                  {inner}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
