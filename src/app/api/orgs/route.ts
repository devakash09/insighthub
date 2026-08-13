import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling, parseJson } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { updateOrgSchema } from "@/lib/validations/resources";
import { recordAudit } from "@/lib/audit";

export const PATCH = withErrorHandling(async (req) => {
  const ctx = await getApiContext("org.settings");
  const input = updateOrgSchema.parse(await parseJson(req));

  await db.organization.update({ where: { id: ctx.org.id }, data: { name: input.name } });

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "org.settings_updated",
    targetType: "organization",
    targetId: ctx.org.id,
    metadata: { field: "name" },
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async () => {
  const ctx = await getApiContext("org.delete");

  // Audit BEFORE deleting — after the cascade there is no org left to attach a
  // log to (and the shared AuditAction union has no dedicated "org.deleted").
  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "org.settings_updated",
    targetType: "organization",
    targetId: ctx.org.id,
    metadata: { deleted: true },
  });

  await db.organization.delete({ where: { id: ctx.org.id } });

  return NextResponse.json({ ok: true });
});
