import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

/** Liveness/readiness probe for containers and load balancers. */
export async function GET() {
  const checks: Record<string, "ok" | "error" | "disabled"> = { app: "ok", database: "error", redis: "disabled" };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  if (redis) {
    try {
      await redis.ping();
      checks.redis = "ok";
    } catch {
      checks.redis = "error";
    }
  }

  const healthy = checks.database === "ok";
  return NextResponse.json(
    { status: healthy ? "healthy" : "unhealthy", checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
