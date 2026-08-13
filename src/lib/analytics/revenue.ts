import "server-only";
import { Prisma, type TransactionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { cached } from "@/lib/cache";
import { pctChange } from "@/lib/format";
import type { DateRange } from "@/lib/date-range";
import type { KpiValue } from "@/lib/analytics/types";

export interface RevenueKpis {
  totalRevenue: KpiValue;
  mrr: KpiValue;
  arr: KpiValue;
  arpu: KpiValue;
  transactions: KpiValue;
  refunds: KpiValue;
  growthRatePct: number | null;
}

function kpi(current: number, previous: number): KpiValue {
  return { current, previous, changePct: pctChange(current, previous) };
}

async function revenueWindow(projectId: string, from: Date, to: Date) {
  const [gross, txCount, refunds, payers, mrrAgg] = await Promise.all([
    db.revenueTransaction.aggregate({
      where: { projectId, occurredAt: { gte: from, lt: to }, status: "SUCCEEDED" },
      _sum: { amount: true },
    }),
    db.revenueTransaction.count({ where: { projectId, occurredAt: { gte: from, lt: to } } }),
    db.revenueTransaction.aggregate({
      where: { projectId, occurredAt: { gte: from, lt: to }, status: "REFUNDED" },
      _sum: { amount: true },
    }),
    db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT "visitorId")::int AS count FROM "RevenueTransaction"
      WHERE "projectId" = ${projectId} AND "occurredAt" >= ${from} AND "occurredAt" < ${to}
        AND status = 'SUCCEEDED' AND "visitorId" IS NOT NULL`,
    // MRR: recurring revenue recognized in the trailing 30 days of the window.
    db.revenueTransaction.aggregate({
      where: {
        projectId,
        occurredAt: { gte: new Date(to.getTime() - 30 * 86_400_000), lt: to },
        status: "SUCCEEDED",
        type: { in: ["SUBSCRIPTION", "RENEWAL"] },
      },
      _sum: { amount: true },
    }),
  ]);

  const revenue = Number(gross._sum.amount ?? 0);
  const payingUsers = payers[0]?.count ?? 0;
  const mrr = Number(mrrAgg._sum.amount ?? 0);
  return {
    revenue,
    mrr,
    arr: mrr * 12,
    arpu: payingUsers === 0 ? 0 : revenue / payingUsers,
    transactions: txCount,
    refunds: Number(refunds._sum.amount ?? 0),
  };
}

export async function getRevenueKpis(projectId: string, range: DateRange): Promise<RevenueKpis> {
  return cached(`rev-kpis:${projectId}:${range.from.getTime()}:${range.to.getTime()}`, 60, async () => {
    const [cur, prev] = await Promise.all([
      revenueWindow(projectId, range.from, range.to),
      revenueWindow(projectId, range.prevFrom, range.prevTo),
    ]);
    return {
      totalRevenue: kpi(cur.revenue, prev.revenue),
      mrr: kpi(cur.mrr, prev.mrr),
      arr: kpi(cur.arr, prev.arr),
      arpu: kpi(cur.arpu, prev.arpu),
      transactions: kpi(cur.transactions, prev.transactions),
      refunds: kpi(cur.refunds, prev.refunds),
      growthRatePct: pctChange(cur.revenue, prev.revenue),
    };
  });
}

/** Gross / refunded / net revenue per bucket. */
export async function getRevenueTimeseries(projectId: string, range: DateRange, granularity = range.granularity) {
  const unit = granularity === "hour" ? "hour" : granularity;
  return cached(`rev-ts:${projectId}:${range.from.getTime()}:${range.to.getTime()}:${unit}`, 60, async () => {
    const rows = await db.$queryRaw<{ bucket: Date; gross: number; refunded: number }[]>`
      SELECT date_trunc(${unit}, "occurredAt") AS bucket,
             COALESCE(SUM("amount") FILTER (WHERE status = 'SUCCEEDED'), 0)::float AS gross,
             COALESCE(SUM("amount") FILTER (WHERE status = 'REFUNDED'), 0)::float AS refunded
      FROM "RevenueTransaction"
      WHERE "projectId" = ${projectId} AND "occurredAt" >= ${range.from} AND "occurredAt" < ${range.to}
      GROUP BY 1 ORDER BY 1`;
    return rows.map((r) => ({
      bucket: r.bucket.toISOString(),
      gross: Math.round(r.gross * 100) / 100,
      refunded: Math.round(r.refunded * 100) / 100,
      net: Math.round((r.gross - r.refunded) * 100) / 100,
    }));
  });
}

export async function getRevenueByProduct(projectId: string, range: DateRange) {
  return cached(`rev-product:${projectId}:${range.from.getTime()}:${range.to.getTime()}`, 120, async () => {
    const rows = await db.$queryRaw<{ name: string; category: string; revenue: number; transactions: number }[]>`
      SELECT pr."name", pr."category",
             COALESCE(SUM(t."amount"), 0)::float AS revenue,
             COUNT(*)::int AS transactions
      FROM "RevenueTransaction" t JOIN "Product" pr ON pr.id = t."productId"
      WHERE t."projectId" = ${projectId} AND t."occurredAt" >= ${range.from} AND t."occurredAt" < ${range.to}
        AND t.status = 'SUCCEEDED'
      GROUP BY pr."name", pr."category"
      ORDER BY revenue DESC`;
    return rows.map((r) => ({ ...r, revenue: Math.round(r.revenue * 100) / 100 }));
  });
}

export async function getRevenueByCountry(projectId: string, range: DateRange, limit = 10) {
  const rows = await db.$queryRaw<{ country: string; revenue: number }[]>`
    SELECT "country", COALESCE(SUM("amount"), 0)::float AS revenue
    FROM "RevenueTransaction"
    WHERE "projectId" = ${projectId} AND "occurredAt" >= ${range.from} AND "occurredAt" < ${range.to}
      AND status = 'SUCCEEDED'
    GROUP BY 1 ORDER BY revenue DESC LIMIT ${limit}`;
  return rows.map((r) => ({ country: r.country, revenue: Math.round(r.revenue * 100) / 100 }));
}

export async function getRevenueBySegment(projectId: string, range: DateRange) {
  const rows = await db.$queryRaw<{ segment: string; revenue: number }[]>`
    SELECT "segment", COALESCE(SUM("amount"), 0)::float AS revenue
    FROM "RevenueTransaction"
    WHERE "projectId" = ${projectId} AND "occurredAt" >= ${range.from} AND "occurredAt" < ${range.to}
      AND status = 'SUCCEEDED'
    GROUP BY 1 ORDER BY revenue DESC`;
  const labels: Record<string, string> = { smb: "SMB", "mid-market": "Mid-market", enterprise: "Enterprise" };
  return rows.map((r) => ({ segment: labels[r.segment] ?? r.segment, revenue: Math.round(r.revenue * 100) / 100 }));
}

export interface TransactionListParams {
  page: number;
  pageSize: number;
  status?: TransactionStatus;
  search?: string;
  from: Date;
  to: Date;
}

export async function listTransactions(projectId: string, params: TransactionListParams) {
  const where: Prisma.RevenueTransactionWhereInput = {
    projectId,
    occurredAt: { gte: params.from, lt: params.to },
    ...(params.status ? { status: params.status } : {}),
    ...(params.search
      ? {
          OR: [
            { id: { contains: params.search } },
            { visitor: { is: { name: { contains: params.search, mode: "insensitive" } } } },
            { visitor: { is: { email: { contains: params.search, mode: "insensitive" } } } },
            { product: { is: { name: { contains: params.search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.revenueTransaction.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        product: { select: { name: true } },
        visitor: { select: { id: true, name: true, email: true } },
      },
    }),
    db.revenueTransaction.count({ where }),
  ]);

  return {
    rows: rows.map((t) => ({ ...t, amount: Number(t.amount) })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}
