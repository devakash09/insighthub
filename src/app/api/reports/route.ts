import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withErrorHandling, parseJson } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { createReportSchema } from "@/lib/validations/resources";
import { recordAudit } from "@/lib/audit";

export const GET = withErrorHandling(async () => {
  const ctx = await getApiContext("analytics.view");
  const reports = await db.savedReport.findMany({
    where: { orgId: ctx.org.id },
    orderBy: { updatedAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
  return NextResponse.json({ reports });
});

export const POST = withErrorHandling(async (req) => {
  const ctx = await getApiContext("reports.create");
  const input = createReportSchema.parse(await parseJson(req));

  const report = await db.savedReport.create({
    data: {
      orgId: ctx.org.id,
      projectId: ctx.project.id,
      createdById: ctx.user.id,
      name: input.name,
      description: input.description,
      config: input.config as Prisma.InputJsonValue,
      schedule: input.schedule,
    },
  });

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "report.created",
    targetType: "report",
    targetId: report.id,
  });

  return NextResponse.json({ report }, { status: 201 });
});
