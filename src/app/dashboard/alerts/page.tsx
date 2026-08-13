import type { Metadata } from "next";
import { BellRing } from "lucide-react";
import type { Alert as AlertModel } from "@prisma/client";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/rbac";
import { formatCurrency, formatNumber, formatPercent, formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card } from "@/components/ui/card";
import { AlertToggle } from "@/app/dashboard/alerts/_components/alert-toggle";
import { AlertActions } from "@/app/dashboard/alerts/_components/alert-actions";
import { NewAlertButton } from "@/app/dashboard/alerts/_components/new-alert-button";
import type {
  AlertCondition,
  AlertFrequency,
  AlertFormData,
  AlertMetric,
} from "@/app/dashboard/alerts/_components/alert-form-dialog";

export const metadata: Metadata = { title: "Alerts" };
export const dynamic = "force-dynamic";

const METRIC_LABELS: Record<AlertMetric, string> = {
  REVENUE: "revenue",
  ACTIVE_USERS: "active users",
  NEW_USERS: "new users",
  SESSIONS: "sessions",
  CONVERSION_RATE: "conversion rate",
  PAGE_VIEWS: "page views",
  ERROR_RATE: "error rate",
};

const FREQUENCY_LABELS: Record<AlertFrequency, string> = {
  HOURLY: "checked hourly",
  DAILY: "checked daily",
  WEEKLY: "checked weekly",
};

const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: "in-app",
  EMAIL: "email",
};

function formatThreshold(metric: AlertMetric, condition: AlertCondition, threshold: number): string {
  if (condition === "INCREASES_BY_PCT" || condition === "DECREASES_BY_PCT") {
    return formatPercent(threshold, threshold % 1 === 0 ? 0 : 1);
  }
  if (metric === "REVENUE") return formatCurrency(threshold);
  if (metric === "CONVERSION_RATE" || metric === "ERROR_RATE") {
    return formatPercent(threshold, threshold % 1 === 0 ? 0 : 1);
  }
  return formatNumber(threshold);
}

function alertSentence(alert: AlertModel): string {
  const metric = METRIC_LABELS[alert.metric as AlertMetric] ?? alert.metric.toLowerCase();
  const value = formatThreshold(alert.metric as AlertMetric, alert.condition as AlertCondition, alert.threshold);
  const condition =
    alert.condition === "ABOVE"
      ? `rises above ${value}`
      : alert.condition === "BELOW"
        ? `falls below ${value}`
        : alert.condition === "INCREASES_BY_PCT"
          ? `increases by more than ${value}`
          : `decreases by more than ${value}`;
  const frequency = FREQUENCY_LABELS[alert.frequency as AlertFrequency] ?? "checked daily";
  const channels = alert.channels.map((c) => CHANNEL_LABELS[c] ?? c.toLowerCase()).join(" + ");
  return `Notify when ${metric} ${condition} · ${frequency} · ${channels}`;
}

export default async function AlertsPage() {
  const ctx = await getOrgContext();
  const canManage = can(ctx.role, "alerts.manage");

  const alerts = await db.alert.findMany({
    where: { orgId: ctx.org.id },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Alerts"
        description="Get notified when metrics cross thresholds"
        actions={canManage ? <NewAlertButton /> : undefined}
      />

      {alerts.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="No alerts configured"
          description="Alerts watch your key metrics and notify you the moment something moves — a revenue drop, an error-rate spike, or a surge in sign-ups."
          action={canManage ? <NewAlertButton /> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const formData: AlertFormData = {
              id: alert.id,
              name: alert.name,
              metric: alert.metric as AlertMetric,
              condition: alert.condition as AlertCondition,
              threshold: alert.threshold,
              frequency: alert.frequency as AlertFrequency,
              channels: alert.channels,
            };
            return (
              <Card key={alert.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <AlertToggle id={alert.id} name={alert.name} isActive={alert.isActive} disabled={!canManage} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{alert.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{alertSentence(alert)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {alert.lastTriggeredAt ? (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <BellRing aria-hidden className="h-3.5 w-3.5 text-primary" />
                        Triggered {formatRelative(alert.lastTriggeredAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Never triggered</span>
                    )}
                    {canManage && <AlertActions alert={formData} />}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
