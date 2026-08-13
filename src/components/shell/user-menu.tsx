"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { LogOut, Monitor, Moon, Settings, Sun, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import type { Role } from "@prisma/client";

function initials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export function UserMenu({
  name,
  email,
  image,
  role,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
}) {
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Account menu">
          <Avatar className="h-7 w-7">
            {image && <AvatarImage src={image} alt="" />}
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
              {initials(name, email)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{name ?? "Account"}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">{ROLE_LABELS[role]} in this workspace</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
            <User aria-hidden className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/dashboard/settings/organization")}>
            <Settings aria-hidden className="h-4 w-4" />
            Workspace settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Theme
        </DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 px-2 pb-1.5">
          {(
            [
              { value: "light", icon: Sun, label: "Light" },
              { value: "dark", icon: Moon, label: "Dark" },
              { value: "system", icon: Monitor, label: "Auto" },
            ] as const
          ).map((t) => (
            <Button
              key={t.value}
              variant={theme === t.value ? "secondary" : "ghost"}
              size="sm"
              className="h-8 flex-col gap-0.5 py-1 text-[10px]"
              onClick={() => setTheme(t.value)}
            >
              <t.icon aria-hidden className="h-3.5 w-3.5" />
              {t.label}
            </Button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut aria-hidden className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
