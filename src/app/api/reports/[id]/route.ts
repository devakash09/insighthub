import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withErrorHandling, parseJson, notFound } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { updateReportSchema } from "@/lib/validations/resources";
import { recordAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withErrorHandling<RouteContext>(async (req, { params }) => {
  const { id } = await params;
  const ctx = await getApiContext("reports.manage");
  const input = updateReportSchema.parse(await parseJson(req));

  const report = await db.savedReport.findUnique({ where: { id } });
  if (!report || report.orgId !== ctx.org.id) throw notFound("Report not found");

  const data: Prisma.SavedReportUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.config !== undefined) data.config = input.config as Prisma.InputJsonValue;
  if (input.schedule !== undefined) data.schedule = input.schedule;

  const updated = await db.savedReport.update({ where: { id }, data });

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "report.updated",
    targetType: "report",
    targetId: id,
    metadata: { fields: Object.keys(data) },
  });

  return NextResponse.json({ report: updated });
});

export const DELETE = withErrorHandling<RouteContext>(async (_req, { params }) => {
  const { id } = await params;
  const ctx = await getApiContext("reports.manage");

  const report = await db.savedReport.findUnique({ where: { id } });
  if (!report || report.orgId !== ctx.org.id) throw notFound("Report not found");

  await db.savedReport.delete({ where: { id } });

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "report.deleted",
    targetType: "report",
    targetId: id,
    metadata: { name: report.name },
  });

  return NextResponse.json({ ok: true });
});
