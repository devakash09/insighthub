"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { can, type Permission } from "@/lib/auth/rbac";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; exact?: boolean; permission?: Permission }[] = [
  { href: "/dashboard/settings", label: "Profile", exact: true },
  { href: "/dashboard/settings/organization", label: "Workspace" },
  { href: "/dashboard/settings/members", label: "Members", permission: "members.manage" },
  { href: "/dashboard/settings/audit-logs", label: "Audit log", permission: "audit.view" },
];

/** Horizontal tab-style navigation between the settings sections. */
export function SettingsNav({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections" className="scrollbar-thin flex gap-1 overflow-x-auto border-b">
      {TABS.filter((tab) => !tab.permission || can(role, tab.permission)).map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
