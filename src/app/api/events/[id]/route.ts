import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling, notFound } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { recordAudit } from "@/lib/audit";

export const DELETE = withErrorHandling<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const ctx = await getApiContext("events.manage");
  const { id } = await params;

  const definition = await db.eventDefinition.findUnique({ where: { id } });
  if (!definition || definition.projectId !== ctx.project.id) throw notFound("Event definition not found");

  // Tracked Event rows survive the delete (definitionId is set null via SetNull).
  await db.eventDefinition.delete({ where: { id } });

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "event_definition.deleted",
    targetType: "event_definition",
    targetId: id,
    metadata: { name: definition.name },
  });

  return NextResponse.json({ ok: true });
});
