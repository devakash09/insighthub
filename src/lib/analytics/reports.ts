import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { badRequest } from "@/lib/api";
import type { DateRange } from "@/lib/date-range";
import type { ReportConfig } from "@/lib/validations/analytics";

export interface ReportRow {
  label: string;
  value: number;
}

export interface ReportResult {
  rows: ReportRow[];
  metric: ReportConfig["metric"];
  dimension: ReportConfig["dimension"];
  unit: "count" | "currency";
}

/**
 * Report-builder executor. All identifiers come from whitelisted maps — user
 * input only ever binds as parameters, never as SQL text.
 */
export async function runReport(projectId: string, range: DateRange, config: ReportConfig): Promise<ReportResult> {
  const { metric, dimension, filters } = config;

  // ── metric family → base table ────────────────────────────────────────────
  // sessions/users/conversions: AnalyticsSession (alias s)
  // page_views: PageView p JOIN AnalyticsSession s
  // events: Event e JOIN AnalyticsSession s
  // revenue: RevenueTransaction t (only date/country dimensions available)
  if (metric === "revenue" && !["date", "country"].includes(dimension)) {
    throw badRequest("Revenue can only be grouped by date or country");
  }
  if ((metric === "revenue" || dimension === "page") && filters.event) {
    // harmless, just ignored — event filter only applies to the events metric
  }
  if (dimension === "page" && (metric === "users" || metric === "sessions" || metric === "conversions")) {
    // Sessions grouped by page = grouped by landing page (documented in UI copy).
  }

  const unit: "count" | "currency" = metric === "revenue" ? "currency" : "count";
  const granularity = range.granularity === "hour" ? "hour" : range.granularity;

  // ── value expression ──────────────────────────────────────────────────────
  const valueExpr =
    metric === "users"
      ? Prisma.raw(`COUNT(DISTINCT s."visitorId")::float`)
      : metric === "sessions"
        ? Prisma.raw(`COUNT(*)::float`)
        : metric === "conversions"
          ? Prisma.raw(`COUNT(*) FILTER (WHERE s."converted")::float`)
          : metric === "page_views"
            ? Prisma.raw(`COUNT(*)::float`)
            : metric === "events"
              ? Prisma.raw(`COUNT(*)::float`)
              : Prisma.raw(`COALESCE(SUM(t."amount"), 0)::float`); // revenue

  // ── dimension expression per family ───────────────────────────────────────
  const timeCol =
    metric === "revenue" ? `t."occurredAt"` : metric === "page_views" ? `p."occurredAt"` : metric === "events" ? `e."occurredAt"` : `s."startedAt"`;

  const dimExpr =
    dimension === "date"
      ? Prisma.sql`date_trunc(${granularity}, ${Prisma.raw(timeCol)})`
      : dimension === "country"
        ? Prisma.raw(metric === "revenue" ? `t."country"` : `s."country"`)
        : dimension === "device"
          ? Prisma.raw(`s."device"::text`)
          : dimension === "browser"
            ? Prisma.raw(`s."browser"`)
            : dimension === "source"
              ? Prisma.raw(`s."source"::text`)
              : metric === "page_views"
                ? Prisma.raw(`p."path"`)
                : Prisma.raw(`s."landingPage"`); // page dimension for session-family metrics

  // ── FROM clause ───────────────────────────────────────────────────────────
  const fromClause =
    metric === "revenue"
      ? Prisma.raw(`"RevenueTransaction" t`)
      : metric === "page_views"
        ? Prisma.raw(`"PageView" p JOIN "AnalyticsSession" s ON s.id = p."sessionId"`)
        : metric === "events"
          ? Prisma.raw(`"Event" e JOIN "AnalyticsSession" s ON s.id = e."sessionId"`)
          : Prisma.raw(`"AnalyticsSession" s`);

  // ── WHERE clause ──────────────────────────────────────────────────────────
  const conditions: Prisma.Sql[] = [];
  if (metric === "revenue") {
    conditions.push(Prisma.sql`t."projectId" = ${projectId}`);
    conditions.push(Prisma.sql`t."occurredAt" >= ${range.from} AND t."occurredAt" < ${range.to}`);
    conditions.push(Prisma.sql`t.status = 'SUCCEEDED'`);
    if (filters.country) conditions.push(Prisma.sql`t."country" = ${filters.country}`);
  } else {
    conditions.push(Prisma.sql`s."projectId" = ${projectId}`);
    conditions.push(Prisma.sql`${Prisma.raw(timeCol)} >= ${range.from} AND ${Prisma.raw(timeCol)} < ${range.to}`);
    if (filters.country) conditions.push(Prisma.sql`s."country" = ${filters.country}`);
    if (filters.device) conditions.push(Prisma.sql`s."device" = ${filters.device}::"DeviceType"`);
    if (filters.browser) conditions.push(Prisma.sql`s."browser" = ${filters.browser}`);
    if (filters.source) conditions.push(Prisma.sql`s."source" = ${filters.source}::"TrafficSource"`);
    if (metric === "events" && filters.event) conditions.push(Prisma.sql`e."name" = ${filters.event}`);
  }
  const whereClause = Prisma.join(conditions, " AND ");

  const orderLimit =
    dimension === "date" ? Prisma.raw(`ORDER BY 1 ASC`) : Prisma.raw(`ORDER BY 2 DESC LIMIT 12`);

  const rows = await db.$queryRaw<{ label: Date | string; value: number }[]>(Prisma.sql`
    SELECT ${dimExpr} AS label, ${valueExpr} AS value
    FROM ${fromClause}
    WHERE ${whereClause}
    GROUP BY 1
    ${orderLimit}`);

  return {
    metric,
    dimension,
    unit,
    rows: rows.map((r) => ({
      label: r.label instanceof Date ? r.label.toISOString() : String(r.label),
      value: unit === "currency" ? Math.round(r.value * 100) / 100 : r.value,
    })),
  };
}
