"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/auth/rbac";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

async function errorMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as {
    error?: string;
    issues?: { message: string }[];
  } | null;
  return data?.issues?.[0]?.message ?? data?.error ?? "Something went wrong. Try again.";
}

export function MemberRoleSelect({
  membershipId,
  role,
  disabled,
  canGrantOwner,
}: {
  membershipId: string;
  role: Role;
  disabled?: boolean;
  canGrantOwner: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Role>(role);
  const [pending, setPending] = useState(false);

  async function onChange(next: Role) {
    if (next === value) return;
    const previous = value;
    setValue(next);
    setPending(true);
    try {
      const res = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, role: next }),
      });
      if (!res.ok) throw new Error(await errorMessage(res));
      toast.success(`Role changed to ${ROLE_LABELS[next]}`);
      router.refresh();
    } catch (err) {
      setValue(previous);
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)} disabled={disabled || pending}>
      <SelectTrigger size="sm" className="w-28" aria-label="Change role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r} disabled={r === "OWNER" && !canGrantOwner}>
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
