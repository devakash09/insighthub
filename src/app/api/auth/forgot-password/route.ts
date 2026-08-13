import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { withErrorHandling, parseJson, tooManyRequests } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mail";

export const POST = withErrorHandling(async (req) => {
  const limited = await rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60);
  if (!limited.ok) throw tooManyRequests(limited.retryAfterSec);

  const { email } = forgotPasswordSchema.parse(await parseJson(req));
  const user = await db.user.findUnique({ where: { email } });

  // Always return 200 so the endpoint doesn't reveal which emails exist.
  if (user) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const url = `${process.env.AUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: "Reset your InsightHub password",
      text: `Hi ${user.name ?? "there"},\n\nUse the link below to set a new password. It expires in 1 hour.\n\n${url}\n\nIf you didn't request this, you can safely ignore this email.`,
    });
  }

  return NextResponse.json({ ok: true, message: "If that email exists, a reset link has been sent." });
});
