import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling, parseJson, badRequest } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { funnelQuerySchema } from "@/lib/validations/analytics";
import { resolveDateRange } from "@/lib/date-range";
import { computeFunnel } from "@/lib/analytics/funnels";

export const POST = withErrorHandling(async (req) => {
  const ctx = await getApiContext("analytics.view");
  const body = funnelQuerySchema.parse(await parseJson(req));
  const range = resolveDateRange(body.range);

  const definitions = await db.eventDefinition.findMany({
    where: { projectId: ctx.project.id, name: { in: body.steps } },
    select: { name: true },
  });
  const known = new Set(definitions.map((d) => d.name));
  const unknown = body.steps.find((step) => !known.has(step));
  if (unknown) throw badRequest(`Unknown event: ${unknown}`);

  return NextResponse.json({ stages: await computeFunnel(ctx.project.id, range, body.steps) });
});
