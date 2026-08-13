import type { Granularity } from "@/lib/date-range";

/** One bucket of the merged overview timeseries. */
export interface TimeseriesPoint {
  /** Bucket start, ISO string (UTC). */
  bucket: string;
  sessions: number;
  pageViews: number;
  newUsers: number;
  activeUsers: number;
  returningUsers: number;
  revenue: number;
  conversions: number;
}

export interface KpiValue {
  current: number;
  previous: number;
  /** Percent change vs previous period; null when previous is 0. */
  changePct: number | null;
}

export interface OverviewKpis {
  totalUsers: KpiValue;
  activeUsers: KpiValue;
  sessions: KpiValue;
  conversionRate: KpiValue;
  revenue: KpiValue;
  avgSessionDuration: KpiValue;
}

export interface SourceBreakdown {
  source: string;
  sessions: number;
  visitors: number;
  conversions: number;
  sharePct: number;
}

export interface GeoRow {
  country: string;
  sessions: number;
  visitors: number;
  revenue: number;
  sharePct: number;
}

export interface SubGeoRow {
  name: string;
  country: string;
  sessions: number;
}

export interface DeviceRow {
  device: string;
  sessions: number;
  sharePct: number;
}

export interface BrowserRow {
  browser: string;
  sessions: number;
  sharePct: number;
}

export interface TopPageRow {
  path: string;
  title: string | null;
  views: number;
  visitors: number;
  avgTimeSec: number;
  bounceRatePct: number;
  conversionRatePct: number;
}

export interface ActivityItem {
  id: string;
  name: string;
  occurredAt: string;
  visitorId: string;
  visitorName: string | null;
  country: string;
  metadata: unknown;
}

export interface FunnelStage {
  name: string;
  label: string;
  users: number;
  /** Conversion from the previous stage (100 for the first). */
  conversionPct: number;
  /** Drop-off from the previous stage (0 for the first). */
  dropOffPct: number;
}

export interface CohortRow {
  cohortStart: string;
  size: number;
  /** retention[0] = 100; index = weeks since cohort start. */
  retention: (number | null)[];
}

export interface SeriesQuery {
  projectId: string;
  from: Date;
  to: Date;
  granularity: Granularity;
}
