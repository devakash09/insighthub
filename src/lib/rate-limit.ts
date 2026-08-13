import { redis } from "@/lib/redis";

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSec: number };

/**
 * Fixed-window rate limiter (Redis INCR/EXPIRE, or in-memory fallback).
 * Keys should include the caller identity, e.g. `login:${ip}`.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const namespaced = `ih:rl:${key}`;
  try {
    if (redis) {
      const count = await redis.incr(namespaced);
      if (count === 1) await redis.expire(namespaced, windowSec);
      const ttl = count > limit ? await redis.ttl(namespaced) : 0;
      return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfterSec: Math.max(ttl, 1) };
    }
  } catch {
    /* fall through to memory */
  }
  const nowMs = Date.now();
  const bucket = memoryBuckets.get(namespaced);
  if (!bucket || bucket.resetAt < nowMs) {
    memoryBuckets.set(namespaced, { count: 1, resetAt: nowMs + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSec: windowSec };
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: Math.ceil((bucket.resetAt - nowMs) / 1000),
  };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
