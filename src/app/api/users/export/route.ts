import { z } from "zod";
import { withErrorHandling } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { listVisitors } from "@/lib/analytics/users";
import { csvResponse, toCsv } from "@/lib/csv";
import { recordAudit } from "@/lib/audit";

/** Same filter params the users page understands — all optional. */
const querySchema = z.object({
  q: z.string().trim().min(1).optional(),
  status: z.enum(["ACTIVE", "DORMANT", "CHURNED"]).optional(),
  device: z.enum(["DESKTOP", "MOBILE", "TABLET"]).optional(),
  source: z.enum(["ORGANIC", "DIRECT", "SOCIAL", "REFERRAL", "PAID", "EMAIL"]).optional(),
  country: z.string().trim().min(1).optional(),
});

const HEADERS = [
  "User ID",
  "Name",
  "Email",
  "Country",
  "Region",
  "City",
  "Device",
  "Browser",
  "Source",
  "Status",
  "First seen",
  "Last active",
  "Sessions",
  "Total revenue",
];

export const GET = withErrorHandling(async (req: Request) => {
  const ctx = await getApiContext("data.export");

  const url = new URL(req.url);
  const filters = querySchema.parse({
    q: url.searchParams.get("q") || undefined,
    status: url.searchParams.get("status") || undefined,
    device: url.searchParams.get("device") || undefined,
    source: url.searchParams.get("source") || undefined,
    country: url.searchParams.get("country") || undefined,
  });

  // Export cap: a single 10k-row page keeps the response (and server memory)
  // bounded. Larger projects should narrow the filters before exporting.
  const { rows } = await listVisitors(ctx.project.id, {
    page: 1,
    pageSize: 10_000,
    search: filters.q,
    status: filters.status,
    device: filters.device,
    source: filters.source,
    country: filters.country,
  });

  const csv = toCsv(
    HEADERS,
    rows.map((v) => [
      v.id,
      v.name,
      v.email,
      v.country,
      v.region,
      v.city,
      v.device,
      v.browser,
      v.source,
      v.status,
      v.firstSeenAt,
      v.lastSeenAt,
      v.sessionsCount,
      v.totalRevenue.toFixed(2),
    ]),
  );

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "report.exported",
    targetType: "visitors",
    metadata: { count: rows.length },
  });

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`insighthub-users-${date}.csv`, csv);
});
