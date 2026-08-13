import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { withErrorHandling, parseJson, badRequest, tooManyRequests } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

export const POST = withErrorHandling(async (req) => {
  const limited = await rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60);
  if (!limited.ok) throw tooManyRequests(limited.retryAfterSec);

  const { token, password } = resetPasswordSchema.parse(await parseJson(req));
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest("This reset link is invalid or has expired. Request a new one.");
  }

  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Belt-and-braces: invalidate any other outstanding reset tokens.
    db.passwordResetToken.deleteMany({ where: { userId: record.userId, id: { not: record.id }, usedAt: null } }),
  ]);

  const membership = await db.membership.findFirst({ where: { userId: record.userId }, orderBy: { createdAt: "asc" } });
  if (membership) {
    await recordAudit({ orgId: membership.orgId, actorId: record.userId, action: "auth.password_reset", targetType: "user", targetId: record.userId, ip: clientIp(req) });
  }

  return NextResponse.json({ ok: true });
});
