import { z } from "zod";

export const REPORT_METRICS = ["users", "sessions", "page_views", "revenue", "conversions", "events"] as const;
export const REPORT_DIMENSIONS = ["date", "country", "device", "browser", "source", "page"] as const;
export const REPORT_CHARTS = ["line", "bar", "area", "pie", "table"] as const;

export const reportFiltersSchema = z
  .object({
    country: z.string().trim().max(60).optional(),
    device: z.enum(["DESKTOP", "MOBILE", "TABLET"]).optional(),
    browser: z.string().trim().max(40).optional(),
    source: z.enum(["ORGANIC", "DIRECT", "SOCIAL", "REFERRAL", "PAID", "EMAIL"]).optional(),
    /** Restrict the `events` metric to one event name. */
    event: z.string().trim().max(60).optional(),
  })
  .partial();

export const reportConfigSchema = z.object({
  metric: z.enum(REPORT_METRICS),
  dimension: z.enum(REPORT_DIMENSIONS),
  chart: z.enum(REPORT_CHARTS).default("line"),
  filters: reportFiltersSchema.default({}),
});

export type ReportConfig = z.infer<typeof reportConfigSchema>;
export type ReportFilters = z.infer<typeof reportFiltersSchema>;

export const analyticsQuerySchema = z.object({
  config: reportConfigSchema,
  range: z.object({
    range: z.string().max(20).optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

export const funnelQuerySchema = z.object({
  steps: z.array(z.string().trim().min(1).max(60)).min(2, "A funnel needs at least 2 steps").max(8),
  range: z.object({
    range: z.string().max(20).optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
