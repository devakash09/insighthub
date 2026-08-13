"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RemoveMemberButton({
  membershipId,
  memberName,
}: {
  membershipId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function onRemove() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/members?membershipId=${encodeURIComponent(membershipId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Something went wrong. Try again.");
      }
      toast.success("Member removed");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <UserMinus aria-hidden className="h-4 w-4" />
          Remove
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove member</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{memberName}</span> will immediately lose
            access to this workspace. You can invite them again later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={removing}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onRemove} disabled={removing}>
            {removing && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            Remove member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
