import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling, parseJson } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { alertSchema } from "@/lib/validations/resources";
import { recordAudit } from "@/lib/audit";

export const GET = withErrorHandling(async () => {
  const ctx = await getApiContext("analytics.view");
  const alerts = await db.alert.findMany({
    where: { orgId: ctx.org.id },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
  return NextResponse.json({ alerts });
});

export const POST = withErrorHandling(async (req) => {
  const ctx = await getApiContext("alerts.manage");
  const input = alertSchema.parse(await parseJson(req));

  const alert = await db.alert.create({
    data: {
      orgId: ctx.org.id,
      projectId: ctx.project.id,
      createdById: ctx.user.id,
      name: input.name,
      metric: input.metric,
      condition: input.condition,
      threshold: input.threshold,
      frequency: input.frequency,
      channels: input.channels,
      isActive: input.isActive,
    },
  });

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "alert.created",
    targetType: "alert",
    targetId: alert.id,
  });

  return NextResponse.json({ alert }, { status: 201 });
});
