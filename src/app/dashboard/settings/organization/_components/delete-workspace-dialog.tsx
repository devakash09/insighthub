"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteWorkspaceDialog({ orgName }: { orgName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const confirmed = confirmText === orgName;

  async function onDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/orgs", { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Something went wrong. Try again.");
      }
      toast.success("Workspace deleted");
      setOpen(false);
      // The org context helper falls back to the next workspace (or /login).
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmText("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 aria-hidden className="h-4 w-4" />
          Delete workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete workspace</DialogTitle>
          <DialogDescription>
            This permanently deletes <span className="font-medium text-foreground">{orgName}</span>,
            including all projects, analytics data, reports, alerts, and memberships. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-workspace-name">
            Type <span className="font-mono text-xs">{orgName}</span> to confirm
          </Label>
          <Input
            id="confirm-workspace-name"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={orgName}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={!confirmed || deleting}>
            {deleting && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            Delete this workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
