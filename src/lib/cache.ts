import { redis } from "@/lib/redis";

type MemoryEntry = { value: string; expiresAt: number };
const memory = new Map<string, MemoryEntry>();

function memoryGet(key: string): string | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: string, ttlSeconds: number) {
  if (memory.size > 2000) memory.clear(); // crude bound; cache is best-effort
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/**
 * Read-through cache. Serializes via JSON; uses Redis when configured,
 * otherwise an in-memory map. Failures always fall through to `fn`.
 */
export async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const namespaced = `ih:${key}`;
  try {
    const hit = redis ? await redis.get(namespaced) : memoryGet(namespaced);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    /* treat as miss */
  }
  const value = await fn();
  const serialized = JSON.stringify(value);
  try {
    if (redis) await redis.set(namespaced, serialized, "EX", ttlSeconds);
    else memorySet(namespaced, serialized, ttlSeconds);
  } catch {
    /* best effort */
  }
  return value;
}

export async function invalidate(prefix: string) {
  const namespaced = `ih:${prefix}`;
  try {
    if (redis) {
      const keys = await redis.keys(`${namespaced}*`);
      if (keys.length) await redis.del(...keys);
    } else {
      for (const key of memory.keys()) if (key.startsWith(namespaced)) memory.delete(key);
    }
  } catch {
    /* best effort */
  }
}
