import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { withErrorHandling, parseJson, unauthorized, forbidden } from "@/lib/api";
import { ORG_COOKIE } from "@/lib/auth/context";

const schema = z.object({ orgId: z.string().min(1) });

export const POST = withErrorHandling(async (req) => {
  const session = await auth();
  if (!session?.user?.id) throw unauthorized();

  const { orgId } = schema.parse(await parseJson(req));
  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });
  if (!membership) throw forbidden("You are not a member of that workspace");

  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true });
});
