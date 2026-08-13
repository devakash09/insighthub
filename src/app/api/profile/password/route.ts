import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withErrorHandling, parseJson, badRequest } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

export const POST = withErrorHandling(async (req) => {
  const ctx = await getApiContext();
  const input = changePasswordSchema.parse(await parseJson(req));

  const user = await db.user.findUnique({ where: { id: ctx.user.id } });
  if (!user?.passwordHash) throw badRequest("This account does not use password sign-in");

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) throw badRequest("Current password is incorrect");

  const passwordHash = await hashPassword(input.password);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "auth.password_reset",
    targetType: "user",
    targetId: user.id,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
});
