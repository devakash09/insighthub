"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export function WorkspaceForm({
  name: initialName,
  slug,
  plan,
}: {
  name: string;
  slug: string;
  plan: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/orgs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await errorMessage(res));
      toast.success("Workspace updated");
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
        <Label htmlFor="workspace-name">Workspace name</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Inc"
          maxLength={60}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="workspace-slug">Slug</Label>
          <Input id="workspace-slug" value={slug} readOnly disabled className="bg-muted/50 font-mono text-xs" />
          <p className="text-xs text-muted-foreground">Slugs are permanent identifiers</p>
        </div>
        <div className="space-y-2">
          <Label>Plan</Label>
          <div>
            <Badge variant="secondary" className="capitalize">
              {plan}
            </Badge>
          </div>
        </div>
      </div>
      <Button type="submit" disabled={saving || name.trim().length < 2}>
        {saving && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
        Save
      </Button>
    </form>
  );
}
