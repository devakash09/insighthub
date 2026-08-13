import Redis from "ioredis";

/**
 * Redis is optional: when REDIS_URL is unset (or the connection fails) the
 * cache and rate limiter fall back to per-instance in-memory storage, which is
 * fine for local dev and single-instance deploys.
 */
const globalForRedis = globalThis as unknown as { redis?: Redis | null };

function createClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  // Connects eagerly; when Redis is unreachable commands fail fast (no offline
  // queue) and callers degrade to their in-memory fallbacks.
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 20 ? null : Math.min(times * 500, 5000)),
    enableOfflineQueue: false,
  });
  client.on("error", () => {
    /* swallow — callers degrade to in-memory fallback */
  });
  return client;
}

export const redis = globalForRedis.redis === undefined ? (globalForRedis.redis = createClient()) : globalForRedis.redis;
