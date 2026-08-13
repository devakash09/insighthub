import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling, parseJson, notFound } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { updateAlertSchema } from "@/lib/validations/resources";
import { recordAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withErrorHandling<RouteContext>(async (req, { params }) => {
  const { id } = await params;
  const ctx = await getApiContext("alerts.manage");
  const input = updateAlertSchema.parse(await parseJson(req));

  const alert = await db.alert.findUnique({ where: { id } });
  if (!alert || alert.orgId !== ctx.org.id) throw notFound("Alert not found");

  const updated = await db.alert.update({ where: { id }, data: input });

  const providedKeys = Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
  const onlyActiveToggled = providedKeys.length === 1 && providedKeys[0] === "isActive";

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "alert.updated",
    targetType: "alert",
    targetId: id,
    metadata: onlyActiveToggled ? { isActive: input.isActive } : { fields: providedKeys },
  });

  return NextResponse.json({ alert: updated });
});

export const DELETE = withErrorHandling<RouteContext>(async (_req, { params }) => {
  const { id } = await params;
  const ctx = await getApiContext("alerts.manage");

  const alert = await db.alert.findUnique({ where: { id } });
  if (!alert || alert.orgId !== ctx.org.id) throw notFound("Alert not found");

  await db.alert.delete({ where: { id } });

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "alert.deleted",
    targetType: "alert",
    targetId: id,
    metadata: { name: alert.name },
  });

  return NextResponse.json({ ok: true });
});
