"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/shell/logo";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { NAV_MAIN } from "@/components/shell/nav-items";
import { cn } from "@/lib/utils";

/** Hamburger drawer for tablet/mobile — full nav in a sheet. */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" aria-label="Open navigation">
          <Menu aria-hidden className="h-4.5 w-4.5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle asChild>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

/** Bottom tab bar on phones: the four core sections. */
export function MobileBottomNav() {
  const pathname = usePathname();
  const items = NAV_MAIN.slice(0, 4);
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden"
    >
      <div className="grid grid-cols-4">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon aria-hidden className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
