import { NextResponse } from "next/server";
import { runReport } from "@/lib/analytics/reports";
import { analyticsQuerySchema } from "@/lib/validations/analytics";
import { resolveDateRange } from "@/lib/date-range";
import { withErrorHandling, parseJson } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";

export const POST = withErrorHandling(async (req) => {
  const ctx = await getApiContext("analytics.view");
  const body = analyticsQuerySchema.parse(await parseJson(req));
  const range = resolveDateRange(body.range);
  const result = await runReport(ctx.project.id, range, body.config);
  return NextResponse.json({ result });
});
