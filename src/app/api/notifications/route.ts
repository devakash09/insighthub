import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withErrorHandling, parseJson } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";

export const GET = withErrorHandling(async () => {
  const ctx = await getApiContext();
  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.notification.count({ where: { userId: ctx.user.id, readAt: null } }),
  ]);
  return NextResponse.json({ notifications, unreadCount });
});

const patchSchema = z.union([
  z.object({ markAllRead: z.literal(true) }),
  z.object({ id: z.string().min(1) }),
]);

export const PATCH = withErrorHandling(async (req) => {
  const ctx = await getApiContext();
  const body = patchSchema.parse(await parseJson(req));

  if ("markAllRead" in body) {
    await db.notification.updateMany({
      where: { userId: ctx.user.id, readAt: null },
      data: { readAt: new Date() },
    });
  } else {
    await db.notification.updateMany({
      where: { id: body.id, userId: ctx.user.id },
      data: { readAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
});
