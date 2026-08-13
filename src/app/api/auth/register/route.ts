import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signupSchema } from "@/lib/validations/auth";
import { withErrorHandling, parseJson, badRequest, tooManyRequests } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "workspace"
  );
}

export const POST = withErrorHandling(async (req) => {
  const limited = await rateLimit(`register:${clientIp(req)}`, 5, 10 * 60);
  if (!limited.ok) throw tooManyRequests(limited.retryAfterSec);

  const input = signupSchema.parse(await parseJson(req));

  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw badRequest("An account with this email already exists");

  const passwordHash = await hashPassword(input.password);
  const orgName = input.orgName?.trim() || `${input.name.split(" ")[0]}'s workspace`;
  const baseSlug = slugify(orgName);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  const { user, org } = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });
    const org = await tx.organization.create({
      data: {
        name: orgName,
        slug,
        plan: "starter",
        memberships: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    await tx.project.create({
      data: { orgId: org.id, name: "My website", domain: input.email.split("@")[1] ?? "example.com" },
    });
    return { user, org };
  });

  await recordAudit({ orgId: org.id, actorId: user.id, action: "auth.signup", targetType: "user", targetId: user.id, ip: clientIp(req) });
  await recordAudit({ orgId: org.id, actorId: user.id, action: "org.created", targetType: "organization", targetId: org.id });

  return NextResponse.json({ ok: true }, { status: 201 });
});
