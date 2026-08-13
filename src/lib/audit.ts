import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "auth.login"
  | "auth.signup"
  | "auth.password_reset"
  | "org.settings_updated"
  | "org.created"
  | "member.invited"
  | "member.role_changed"
  | "member.removed"
  | "report.created"
  | "report.updated"
  | "report.deleted"
  | "report.exported"
  | "alert.created"
  | "alert.updated"
  | "alert.deleted"
  | "event_definition.created"
  | "event_definition.deleted";

/** Fire-and-forget audit trail write; must never break the main action. */
export async function recordAudit(entry: {
  orgId: string;
  actorId?: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        orgId: entry.orgId,
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata,
        ip: entry.ip,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record:", err);
  }
}
