"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_MAIN, NAV_WORKSPACE, type NavItem } from "@/components/shell/nav-items";
import { cn } from "@/lib/utils";

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary dark:bg-primary/15"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

/** Nav list shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-4 overflow-y-auto scrollbar-thin px-3 py-4">
      <div className="space-y-0.5">
        {NAV_MAIN.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </div>
      <div>
        <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Workspace
        </p>
        <div className="space-y-0.5">
          {NAV_WORKSPACE.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </nav>
  );
}
