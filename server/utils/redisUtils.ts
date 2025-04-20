// utils/redisUtils.ts
import type { PushSubscription } from "web-push";
import type { Redis } from "ioredis";
// import { useEvent } from "#imports"; // causes many errors, because it's meant to serve http not sockets
// import { redisClient } from "../plugins/redis";

// Helper to get Redis client
// function getRedisClient(): Redis | null {
//   // Try H3 event context (available in routes/middleware)
//   const event = useEvent();
//   const redisFromEvent = event?.context?.redis;

//   if (redisFromEvent) {
//     return redisFromEvent;
//   }

//   // Fallback to imported redisClient
//   if (redisClient) {
//     return redisClient;
//   }

//   console.error("❌ Redis client not available");
//   return null;
// }

export async function saveSubscription(
  redis: Redis,
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  if (import.meta.prerender) {
    console.log("⚠️ Skipping Redis during prerendering");
    return;
  }

  try {
    await redis.set(
      `push:subscription:${userId}`,
      JSON.stringify(subscription)
    );
    console.log(`✅ Saved subscription for user: ${userId}, though we might need to persist it in disk!`);
  } catch (error) {
    console.error(`❌ Failed to save subscription for user ${userId}:`, error);
    throw new Error("Failed to save subscription");
  }
}

export async function getSubscription(
  redis: Redis,
  userId: string
): Promise<PushSubscription | null> {
  if (import.meta.prerender) {
    console.log("⚠️ Skipping Redis during prerendering");
    return null;
  }

  // const redis = getRedisClient();
  // if (!redis) {
  //   console.error("❌ Cannot get subscription: Redis client not available");
  //   return null;
  // }

  try {
    const subscriptionJson = await redis.get(`push:subscription:${userId}`);
    return subscriptionJson ? JSON.parse(subscriptionJson) : null;
  } catch (error) {
    console.error(`❌ Failed to get subscription for user ${userId}:`, error);
    return null;
  }
}
