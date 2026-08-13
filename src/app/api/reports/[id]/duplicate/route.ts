import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withErrorHandling, notFound } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { recordAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withErrorHandling<RouteContext>(async (_req, { params }) => {
  const { id } = await params;
  const ctx = await getApiContext("reports.create");

  const source = await db.savedReport.findUnique({ where: { id } });
  if (!source || source.orgId !== ctx.org.id) throw notFound("Report not found");

  const copy = await db.savedReport.create({
    data: {
      orgId: ctx.org.id,
      projectId: source.projectId,
      createdById: ctx.user.id,
      name: `${source.name} (copy)`,
      description: source.description,
      config: source.config as Prisma.InputJsonValue,
      schedule: "NONE",
    },
  });

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "report.created",
    targetType: "report",
    targetId: copy.id,
    metadata: { duplicatedFrom: source.id },
  });

  return NextResponse.json({ report: copy }, { status: 201 });
});
