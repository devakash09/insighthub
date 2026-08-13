"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function errorMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as {
    error?: string;
    issues?: { message: string }[];
  } | null;
  return data?.issues?.[0]?.message ?? data?.error ?? "Something went wrong. Try again.";
}

export function ProfileForm({ name: initialName, email }: { name: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await errorMessage(res));
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          maxLength={80}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={email} readOnly disabled className="bg-muted/50" />
        <p className="text-xs text-muted-foreground">Email is your sign-in identity</p>
      </div>
      <Button type="submit" disabled={saving || name.trim().length < 2}>
        {saving && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
        Save
      </Button>
    </form>
  );
}
