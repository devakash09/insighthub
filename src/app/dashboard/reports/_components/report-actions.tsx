"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  Copy,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Schedule = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";

interface ReportActionsProps {
  report: { id: string; name: string; description: string | null; schedule: Schedule };
  canManage: boolean;
  canExport: boolean;
}

type DialogKind = "rename" | "schedule" | "delete" | null;

export function ReportActions({ report, canManage, canExport }: ReportActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(report.name);
  const [description, setDescription] = useState(report.description ?? "");
  const [schedule, setSchedule] = useState<Schedule>(report.schedule);
  const [issues, setIssues] = useState<Record<string, string>>({});

  const rangeQuery = (() => {
    const qs = new URLSearchParams();
    for (const key of ["range", "from", "to"]) {
      const value = searchParams.get(key);
      if (value) qs.set(key, value);
    }
    const s = qs.toString();
    return s ? `?${s}` : "";
  })();
  const exportHref = `/api/reports/${report.id}/export${rangeQuery}`;

  function closeDialog() {
    setDialog(null);
    setIssues({});
  }

  async function patch(body: unknown, successMessage: string) {
    setPending(true);
    setIssues({});
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 422) {
        const data = (await res.json()) as { issues?: { path: string; message: string }[] };
        const next: Record<string, string> = {};
        for (const issue of data.issues ?? []) next[issue.path] = issue.message;
        setIssues(next);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      toast.success(successMessage);
      closeDialog();
      router.refresh();
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function duplicate() {
    setPending(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      toast.success("Report duplicated");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      const res = await fetch(`/api/reports/${report.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      toast.success("Report deleted");
      closeDialog();
      router.refresh();
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${report.name}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/analytics?report=${report.id}`}>
              <SlidersHorizontal aria-hidden />
              Open in builder
            </Link>
          </DropdownMenuItem>
          {canExport && (
            <DropdownMenuItem asChild>
              <a href={exportHref}>
                <Download aria-hidden />
                Export CSV
              </a>
            </DropdownMenuItem>
          )}
          {canManage && (
            <>
              <DropdownMenuItem
                onSelect={() => {
                  setName(report.name);
                  setDescription(report.description ?? "");
                  setIssues({});
                  setDialog("rename");
                }}
              >
                <Pencil aria-hidden />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void duplicate()} disabled={pending}>
                <Copy aria-hidden />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setSchedule(report.schedule);
                  setIssues({});
                  setDialog("schedule");
                }}
              >
                <CalendarClock aria-hidden />
                Schedule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                <Trash2 aria-hidden />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename */}
      <Dialog open={dialog === "rename"} onOpenChange={(open) => (open ? setDialog("rename") : closeDialog())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename report</DialogTitle>
            <DialogDescription>Update the name and description everyone in the workspace sees.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void patch({ name, description }, "Report updated");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor={`report-name-${report.id}`}>Name</Label>
              <Input
                id={`report-name-${report.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                autoFocus
              />
              {issues.name && <p className="text-xs text-destructive">{issues.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`report-description-${report.id}`}>Description</Label>
              <Textarea
                id={`report-description-${report.id}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="What does this report show?"
              />
              {issues.description && <p className="text-xs text-destructive">{issues.description}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 aria-hidden className="animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule */}
      <Dialog open={dialog === "schedule"} onOpenChange={(open) => (open ? setDialog("schedule") : closeDialog())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule report</DialogTitle>
            <DialogDescription>Run this report automatically on a recurring cadence.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void patch({ schedule }, "Schedule updated");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor={`report-schedule-${report.id}`}>Frequency</Label>
              <Select value={schedule} onValueChange={(v) => setSchedule(v as Schedule)}>
                <SelectTrigger id={`report-schedule-${report.id}`} className="w-full">
                  <SelectValue placeholder="Select a schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {issues.schedule && <p className="text-xs text-destructive">{issues.schedule}</p>}
              <p className="text-xs text-muted-foreground">Scheduled reports are emailed to workspace admins.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 aria-hidden className="animate-spin" />}
                Save schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={dialog === "delete"} onOpenChange={(open) => (open ? setDialog("delete") : closeDialog())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete report</DialogTitle>
            <DialogDescription>
              This permanently deletes “{report.name}” for everyone in the workspace. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void remove()} disabled={pending}>
              {pending && <Loader2 aria-hidden className="animate-spin" />}
              Delete report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
