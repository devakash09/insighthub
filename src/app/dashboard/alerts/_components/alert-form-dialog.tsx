"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AlertMetric =
  | "REVENUE"
  | "ACTIVE_USERS"
  | "NEW_USERS"
  | "SESSIONS"
  | "CONVERSION_RATE"
  | "PAGE_VIEWS"
  | "ERROR_RATE";
export type AlertCondition = "ABOVE" | "BELOW" | "INCREASES_BY_PCT" | "DECREASES_BY_PCT";
export type AlertFrequency = "HOURLY" | "DAILY" | "WEEKLY";
export type AlertChannel = "IN_APP" | "EMAIL";

export interface AlertFormData {
  id: string;
  name: string;
  metric: AlertMetric;
  condition: AlertCondition;
  threshold: number;
  frequency: AlertFrequency;
  channels: string[];
}

const METRIC_OPTIONS: { value: AlertMetric; label: string }[] = [
  { value: "REVENUE", label: "Revenue" },
  { value: "ACTIVE_USERS", label: "Active users" },
  { value: "NEW_USERS", label: "New users" },
  { value: "SESSIONS", label: "Sessions" },
  { value: "CONVERSION_RATE", label: "Conversion rate" },
  { value: "PAGE_VIEWS", label: "Page views" },
  { value: "ERROR_RATE", label: "Error rate" },
];

const CONDITION_OPTIONS: { value: AlertCondition; label: string }[] = [
  { value: "ABOVE", label: "Rises above" },
  { value: "BELOW", label: "Falls below" },
  { value: "INCREASES_BY_PCT", label: "Increases by more than" },
  { value: "DECREASES_BY_PCT", label: "Decreases by more than" },
];

const FREQUENCY_OPTIONS: { value: AlertFrequency; label: string }[] = [
  { value: "HOURLY", label: "Hourly" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
];

export function AlertFormDialog({
  open,
  onOpenChange,
  alert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this alert; otherwise it creates a new one. */
  alert?: AlertFormData;
}) {
  // Keying the body on each open remounts it, so form state re-initializes
  // from props without effect-driven resets.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <AlertFormBody key={alert?.id ?? "new"} onOpenChange={onOpenChange} alert={alert} />}
    </Dialog>
  );
}

function AlertFormBody({
  onOpenChange,
  alert,
}: {
  onOpenChange: (open: boolean) => void;
  alert?: AlertFormData;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [name, setName] = useState(alert?.name ?? "");
  const [metric, setMetric] = useState<AlertMetric>(alert?.metric ?? "REVENUE");
  const [condition, setCondition] = useState<AlertCondition>(alert?.condition ?? "DECREASES_BY_PCT");
  const [threshold, setThreshold] = useState(alert ? String(alert.threshold) : "");
  const [frequency, setFrequency] = useState<AlertFrequency>(alert?.frequency ?? "DAILY");
  const [channels, setChannels] = useState<AlertChannel[]>(
    alert ? (alert.channels.filter((c) => c === "IN_APP" || c === "EMAIL") as AlertChannel[]) : ["IN_APP"],
  );

  const isPct = condition === "INCREASES_BY_PCT" || condition === "DECREASES_BY_PCT";
  const suffix = isPct ? "%" : metric === "REVENUE" ? "$" : null;

  function toggleChannel(channel: AlertChannel, checked: boolean) {
    setChannels((prev) => (checked ? [...new Set([...prev, channel])] : prev.filter((c) => c !== channel)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextIssues: Record<string, string> = {};
    if (threshold.trim() === "" || Number.isNaN(Number(threshold))) {
      nextIssues.threshold = "Enter a threshold value";
    }
    if (channels.length === 0) {
      nextIssues.channels = "Pick at least one notification method";
    }
    if (Object.keys(nextIssues).length > 0) {
      setIssues(nextIssues);
      return;
    }

    setPending(true);
    setIssues({});
    try {
      const body = {
        name: name.trim(),
        metric,
        condition,
        threshold: Number(threshold),
        frequency,
        channels,
      };
      const res = await fetch(alert ? `/api/alerts/${alert.id}` : "/api/alerts", {
        method: alert ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 422) {
        const data = (await res.json()) as { issues?: { path: string; message: string }[] };
        const mapped: Record<string, string> = {};
        for (const issue of data.issues ?? []) mapped[issue.path] = issue.message;
        setIssues(mapped);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      toast.success(alert ? "Alert updated" : "Alert created");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{alert ? "Edit alert" : "New alert"}</DialogTitle>
          <DialogDescription>
            {alert
              ? "Change when and how this alert notifies your team."
              : "Get notified when a metric crosses a threshold."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="alert-name">Name</Label>
            <Input
              id="alert-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Revenue drop"
              maxLength={80}
              autoFocus
            />
            {issues.name && <p className="text-xs text-destructive">{issues.name}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="alert-metric">Metric</Label>
              <Select value={metric} onValueChange={(v) => setMetric(v as AlertMetric)}>
                <SelectTrigger id="alert-metric" className="w-full">
                  <SelectValue placeholder="Select a metric" />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {issues.metric && <p className="text-xs text-destructive">{issues.metric}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-condition">Condition</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as AlertCondition)}>
                <SelectTrigger id="alert-condition" className="w-full">
                  <SelectValue placeholder="Select a condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {issues.condition && <p className="text-xs text-destructive">{issues.condition}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="alert-threshold">Threshold</Label>
              <div className="relative">
                <Input
                  id="alert-threshold"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className={suffix ? "pr-8" : undefined}
                  placeholder={isPct ? "e.g. 20" : "e.g. 500"}
                />
                {suffix && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
                  >
                    {suffix}
                  </span>
                )}
              </div>
              {issues.threshold && <p className="text-xs text-destructive">{issues.threshold}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-frequency">Check frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as AlertFrequency)}>
                <SelectTrigger id="alert-frequency" className="w-full">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {issues.frequency && <p className="text-xs text-destructive">{issues.frequency}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notification methods</Label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={channels.includes("IN_APP")}
                  onCheckedChange={(checked) => toggleChannel("IN_APP", checked === true)}
                  aria-label="Notify in-app"
                />
                In-app
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={channels.includes("EMAIL")}
                  onCheckedChange={(checked) => toggleChannel("EMAIL", checked === true)}
                  aria-label="Notify by email"
                />
                Email
              </label>
            </div>
            {issues.channels && <p className="text-xs text-destructive">{issues.channels}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 aria-hidden className="animate-spin" />}
              {alert ? "Save changes" : "Create alert"}
            </Button>
          </DialogFooter>
        </form>
    </DialogContent>
  );
}
