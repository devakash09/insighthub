"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import type { Role } from "@prisma/client";

export interface WorkspaceOption {
  id: string;
  name: string;
  role: Role;
}

export function WorkspaceSwitcher({ workspaces, activeId }: { workspaces: WorkspaceOption[]; activeId: string }) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  const switchTo = async (orgId: string) => {
    if (orgId === activeId) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/orgs/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (!res.ok) throw new Error();
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Couldn't switch workspace. Try again.");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 font-medium" disabled={switching}>
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary">
            <Building2 aria-hidden className="h-3 w-3" />
          </span>
          <span className="max-w-[140px] truncate text-[13px]">{active?.name}</span>
          <ChevronsUpDown aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Workspaces
        </DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem key={w.id} onClick={() => switchTo(w.id)} className="gap-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-medium">{w.name}</span>
              <span className="text-[11px] text-muted-foreground">{ROLE_LABELS[w.role]}</span>
            </div>
            {w.id === activeId && <Check aria-hidden className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/dashboard/settings/organization")}>
          Workspace settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
