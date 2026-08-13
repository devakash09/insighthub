"use client";

import { useState } from "react";
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

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("New passwords do not match");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, password }),
      });
      if (!res.ok) throw new Error(await errorMessage(res));
      toast.success("Password updated");
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            aria-invalid={mismatch || undefined}
            required
          />
          {mismatch && <p className="text-xs text-destructive">Passwords do not match</p>}
        </div>
      </div>
      <Button type="submit" disabled={saving || !currentPassword || password.length < 8 || mismatch}>
        {saving && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
        Update password
      </Button>
    </form>
  );
}
