import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(redisUrl);

/**
 * Save a Push API subscription for a given user ID.
 * @param {string} userId The user ID to associate the subscription with.
 * @param {PushSubscription} subscription The Push API subscription to save.
 * @returns {Promise<void>}
 */
export async function saveSubscription(userId, subscription) {
  await redis.set(`push:subscription:${userId}`, JSON.stringify(subscription));
}

/**
 * Retrieve a saved Push API subscription associated with a given user ID.
 * @param {string} userId The user ID to look up the subscription for.
 * @returns {Promise<PushSubscription|null>} The associated Push API subscription, or null if none is found.
 */
export async function getSubscription(userId) {
  const subscriptionJson = await redis.get(`push:subscription:${userId}`);
  return subscriptionJson ? JSON.parse(subscriptionJson) : null;
}
