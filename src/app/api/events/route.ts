import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling, parseJson, badRequest } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { eventDefinitionSchema } from "@/lib/validations/resources";
import { recordAudit } from "@/lib/audit";

export const POST = withErrorHandling(async (req) => {
  const ctx = await getApiContext("events.manage");
  const data = eventDefinitionSchema.parse(await parseJson(req));

  const existing = await db.eventDefinition.findUnique({
    where: { projectId_name: { projectId: ctx.project.id, name: data.name } },
  });
  if (existing) throw badRequest("An event with this name already exists");

  const definition = await db.eventDefinition.create({
    data: {
      projectId: ctx.project.id,
      name: data.name,
      description: data.description,
      isConversion: data.isConversion,
    },
  });

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "event_definition.created",
    targetType: "event_definition",
    targetId: definition.id,
    metadata: { name: definition.name },
  });

  return NextResponse.json({ definition }, { status: 201 });
});
