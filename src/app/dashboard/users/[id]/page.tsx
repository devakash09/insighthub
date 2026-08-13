import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, MousePointerClick, Receipt } from "lucide-react";
import { getOrgContext } from "@/lib/auth/context";
import { getVisitorDetail } from "@/lib/analytics/users";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCompact,
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatRelative,
} from "@/lib/format";
import {
  DEVICE_LABELS,
  SOURCE_LABELS,
  TRANSACTION_TYPE_LABELS,
  TransactionStatusBadge,
  VisitorStatusBadge,
  nameInitials,
} from "@/app/dashboard/users/_components/visitor-badges";

export const metadata: Metadata = { title: "User detail" };
export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  signup: "Signed up",
  login: "Logged in",
  purchase: "Made a purchase",
  checkout_started: "Started checkout",
  product_view: "Viewed a plan",
  subscription_created: "Started a subscription",
  button_clicked: "Clicked a CTA",
};

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getOrgContext();
  const detail = await getVisitorDetail(ctx.project.id, id);
  if (!detail) notFound();

  const { visitor, sessions, events, transactions, eventCounts, stats } = detail;
  const location = visitor.city ? `${visitor.city}, ${visitor.country}` : visitor.country;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/dashboard/users"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
          All users
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarFallback className="text-sm font-medium">{nameInitials(visitor.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{visitor.name ?? "Anonymous"}</h1>
                <VisitorStatusBadge status={visitor.status} />
              </div>
              {visitor.email && <p className="mt-0.5 text-sm text-muted-foreground">{visitor.email}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{location}</Badge>
            <Badge variant="outline">{DEVICE_LABELS[visitor.device]}</Badge>
            <Badge variant="outline">{visitor.browser}</Badge>
            <Badge variant="outline">{SOURCE_LABELS[visitor.source]}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Sessions" value={formatNumber(visitor.sessionsCount)} />
        <StatTile label="Total revenue" value={formatCurrencyCompact(visitor.totalRevenue)} />
        <StatTile label="Page views" value={formatCompact(stats.totalPageViews)} />
        <StatTile label="Avg. session duration" value={formatDuration(stats.avgDurationSec)} />
        <StatTile label="First seen" value={formatDate(visitor.firstSeenAt)} />
        <StatTile label="Last active" value={formatRelative(visitor.lastSeenAt)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <ChartCard
          title="Recent sessions"
          description="Latest sessions by this user"
          className="lg:col-span-7"
          contentClassName="overflow-x-auto scrollbar-thin"
        >
          {sessions.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No sessions yet"
              description="Sessions will appear here as soon as this user visits your site again."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead className="text-right">Pages</TableHead>
                  <TableHead>Converted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{formatDateTime(s.startedAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(s.durationSec)}</TableCell>
                    <TableCell className="text-muted-foreground">{SOURCE_LABELS[s.source]}</TableCell>
                    <TableCell className="text-muted-foreground">{DEVICE_LABELS[s.device]}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(s.pageViewsCount)}</TableCell>
                    <TableCell>
                      {s.converted ? (
                        <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                          Converted
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ChartCard>

        <ChartCard title="Activity" description="Latest tracked events by this user" className="lg:col-span-5">
          {events.length === 0 ? (
            <EmptyState
              icon={MousePointerClick}
              title="No events tracked yet"
              description="Events fired by this user (beyond page views) will show up in this timeline."
            />
          ) : (
            <ol className="relative space-y-4 before:absolute before:inset-y-1 before:left-[5px] before:w-px before:bg-border">
              {events.map((event) => (
                <li key={event.id} className="relative flex items-start gap-3 pl-5">
                  <span
                    aria-hidden
                    className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-card bg-[var(--chart-1)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{EVENT_LABELS[event.name] ?? `Fired ${event.name}`}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                        {event.name}
                      </Badge>
                      {formatRelative(event.occurredAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </ChartCard>

        <ChartCard
          title="Transactions"
          description="Purchases and subscription payments"
          className="lg:col-span-7"
          contentClassName="overflow-x-auto scrollbar-thin"
        >
          {transactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Once this user makes a purchase or starts a subscription, it will be listed here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.product.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(t.amount, { cents: true })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{TRANSACTION_TYPE_LABELS[t.type]}</TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(t.occurredAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ChartCard>

        <ChartCard title="Top events" description="Most fired events, all time" className="lg:col-span-5">
          {eventCounts.length === 0 ? (
            <EmptyState
              icon={MousePointerClick}
              title="No events yet"
              description="A breakdown of this user's most frequent events will appear here."
            />
          ) : (
            <CategoryBarChart
              data={eventCounts.slice(0, 8).map((e) => ({ label: e.name, value: e.count }))}
              horizontal
              height={Math.max(140, Math.min(eventCounts.length, 8) * 34)}
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

/** Small label + value tile — no delta here, so KpiCard would be overkill. */
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-0 p-4">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 truncate text-xl font-semibold tracking-tight">{value}</p>
    </Card>
  );
}
