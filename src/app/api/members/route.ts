import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling, parseJson, badRequest, forbidden, notFound } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { changeRoleSchema, inviteMemberSchema } from "@/lib/validations/resources";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { recordAudit } from "@/lib/audit";
import { sendMail } from "@/lib/mail";

/** Invite a member: adds an existing account directly, otherwise simulates an email invite. */
export const POST = withErrorHandling(async (req) => {
  const ctx = await getApiContext("members.manage");
  const input = inviteMemberSchema.parse(await parseJson(req));

  const invitee = await db.user.findUnique({ where: { email: input.email } });

  if (!invitee) {
    // No account yet — simulated email invite pointing at signup.
    await sendMail({
      to: input.email,
      subject: `You've been invited to ${ctx.org.name} on InsightHub`,
      text: `${ctx.user.name ?? "A teammate"} invited you to join the ${ctx.org.name} workspace on InsightHub as ${ROLE_LABELS[input.role]}. Create your account at /signup using this email address to get started.`,
    });
    await recordAudit({
      orgId: ctx.org.id,
      actorId: ctx.user.id,
      action: "member.invited",
      targetType: "user",
      metadata: { email: input.email, role: input.role, pending: true },
    });
    return NextResponse.json({ ok: true, pending: true, message: "Invitation sent" });
  }

  const existing = await db.membership.findUnique({
    where: { userId_orgId: { userId: invitee.id, orgId: ctx.org.id } },
  });
  if (existing) throw badRequest("Already a member");

  const membership = await db.membership.create({
    data: { userId: invitee.id, orgId: ctx.org.id, role: input.role },
  });

  await db.notification.create({
    data: {
      userId: invitee.id,
      orgId: ctx.org.id,
      type: "info",
      title: `You've been added to ${ctx.org.name}`,
      body: `You now have ${ROLE_LABELS[input.role]} access to this workspace.`,
      link: "/dashboard",
    },
  });

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "member.invited",
    targetType: "membership",
    targetId: membership.id,
    metadata: { email: input.email, role: input.role },
  });

  return NextResponse.json({ ok: true, pending: false, message: "Member added" });
});

/** Change a member's role. */
export const PATCH = withErrorHandling(async (req) => {
  const ctx = await getApiContext("members.manage");
  const input = changeRoleSchema.parse(await parseJson(req));

  const membership = await db.membership.findUnique({
    where: { id: input.membershipId },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!membership || membership.orgId !== ctx.org.id) throw notFound("Member not found");

  if (membership.userId === ctx.user.id) throw badRequest("You cannot change your own role");
  if ((membership.role === "OWNER" || input.role === "OWNER") && ctx.role !== "OWNER") {
    throw forbidden("Only an owner can grant or revoke the owner role");
  }
  if (membership.role === "OWNER" && input.role !== "OWNER") {
    const ownerCount = await db.membership.count({ where: { orgId: ctx.org.id, role: "OWNER" } });
    if (ownerCount <= 1) throw badRequest("Transfer ownership first");
  }

  if (membership.role !== input.role) {
    await db.membership.update({ where: { id: membership.id }, data: { role: input.role } });

    await recordAudit({
      orgId: ctx.org.id,
      actorId: ctx.user.id,
      action: "member.role_changed",
      targetType: "membership",
      targetId: membership.id,
      metadata: { email: membership.user.email, from: membership.role, to: input.role },
    });

    await db.notification.create({
      data: {
        userId: membership.userId,
        orgId: ctx.org.id,
        type: "info",
        title: `Your role in ${ctx.org.name} changed`,
        body: `You are now ${ROLE_LABELS[input.role]} in this workspace.`,
        link: "/dashboard",
      },
    });
  }

  return NextResponse.json({ ok: true });
});

/** Remove a member from the workspace. */
export const DELETE = withErrorHandling(async (req) => {
  const ctx = await getApiContext("members.manage");
  const membershipId = new URL(req.url).searchParams.get("membershipId");
  if (!membershipId) throw badRequest("membershipId is required");

  const membership = await db.membership.findUnique({
    where: { id: membershipId },
    include: { user: { select: { email: true } } },
  });
  if (!membership || membership.orgId !== ctx.org.id) throw notFound("Member not found");

  if (membership.userId === ctx.user.id) throw badRequest("You cannot remove yourself");
  if (membership.role === "OWNER") {
    if (ctx.role !== "OWNER") throw forbidden("Only an owner can remove another owner");
    const ownerCount = await db.membership.count({ where: { orgId: ctx.org.id, role: "OWNER" } });
    if (ownerCount <= 1) throw badRequest("Transfer ownership first");
  }

  await db.membership.delete({ where: { id: membership.id } });

  await recordAudit({
    orgId: ctx.org.id,
    actorId: ctx.user.id,
    action: "member.removed",
    targetType: "membership",
    targetId: membership.id,
    metadata: { email: membership.user.email, role: membership.role },
  });

  return NextResponse.json({ ok: true });
});
