import type { Redis } from "ioredis";

// Deletes all blog:list:* keys so the next read repopulates from the database.
// Uses SCAN (non-blocking) instead of KEYS, and fails soft: a missed
// invalidation only costs up to the 5-minute list TTL, whereas throwing here
// would fail an already-committed write.
export async function invalidateBlogListCache(redis?: Redis | null): Promise<void> {
  if (!redis) return;
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        "blog:list:*",
        "COUNT",
        200,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (e) {
    console.warn("⚠️ Failed to invalidate blog list cache:", e);
  }
}
