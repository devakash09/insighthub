import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling, parseJson } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";
import { updateProfileSchema } from "@/lib/validations/resources";

export const PATCH = withErrorHandling(async (req) => {
  const ctx = await getApiContext();
  const input = updateProfileSchema.parse(await parseJson(req));

  await db.user.update({ where: { id: ctx.user.id }, data: { name: input.name } });

  return NextResponse.json({ ok: true });
});
