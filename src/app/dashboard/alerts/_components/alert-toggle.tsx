"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export function AlertToggle({
  id,
  name,
  isActive,
  disabled,
}: {
  id: string;
  name: string;
  isActive: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(isActive);
  const [pending, setPending] = useState(false);

  async function toggle(next: boolean) {
    setChecked(next); // optimistic
    setPending(true);
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        setChecked(!next);
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      toast.success(next ? "Alert resumed" : "Alert paused");
      router.refresh();
    } catch {
      setChecked(!next);
      toast.error("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Switch
      checked={checked}
      onCheckedChange={(next) => void toggle(next)}
      disabled={disabled || pending}
      aria-label={`${checked ? "Pause" : "Resume"} alert ${name}`}
    />
  );
}
