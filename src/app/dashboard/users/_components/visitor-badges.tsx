import type { DeviceType, TrafficSource, TransactionStatus, TransactionType, VisitorStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

export const DEVICE_LABELS: Record<DeviceType, string> = {
  DESKTOP: "Desktop",
  MOBILE: "Mobile",
  TABLET: "Tablet",
};

export const SOURCE_LABELS: Record<TrafficSource, string> = {
  ORGANIC: "Organic",
  DIRECT: "Direct",
  SOCIAL: "Social",
  REFERRAL: "Referral",
  PAID: "Paid",
  EMAIL: "Email",
};

export const STATUS_LABELS: Record<VisitorStatus, string> = {
  ACTIVE: "Active",
  DORMANT: "Dormant",
  CHURNED: "Churned",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  ONE_TIME: "One-time",
  SUBSCRIPTION: "Subscription",
  RENEWAL: "Renewal",
};

/** Lifecycle status pill: state is encoded with color + dot + label, never color alone. */
export function VisitorStatusBadge({ status }: { status: VisitorStatus }) {
  if (status === "ACTIVE") {
    return (
      <Badge variant="outline" className="gap-1.5 border-success/30 bg-success/10 text-success">
        <span aria-hidden className="size-1.5 rounded-full bg-success" />
        Active
      </Badge>
    );
  }
  if (status === "DORMANT") {
    return <Badge variant="secondary">Dormant</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">Churned</Badge>;
}

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  switch (status) {
    case "SUCCEEDED":
      return <Badge variant="outline" className="border-success/30 bg-success/10 text-success">Succeeded</Badge>;
    case "PENDING":
      return <Badge variant="secondary">Pending</Badge>;
    case "REFUNDED":
      return <Badge variant="outline" className="border-destructive/30 text-destructive">Refunded</Badge>;
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
  }
}

/** Avatar-fallback initials: up to two letters from the first two words of a name. */
export function nameInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + second).toUpperCase();
}
