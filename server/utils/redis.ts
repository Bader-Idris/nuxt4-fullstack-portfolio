/**
 * Save a Push API subscription for a given user ID.
 * @param {string} userId The user ID to associate the subscription with.
 * @param {PushSubscription} subscription The Push API subscription to save.
 * @returns {Promise<void>}
 */
export async function saveSubscription(userId, subscription) {
  // const redis = event.context.nitro?.redis
  const redis = await useNitro().redis;
  await redis.set(`push:subscription:${userId}`, JSON.stringify(subscription));

  // const redisStorage = useStorage('redis');
  // await redisStorage.setItem(`push:subscription:${userId}`, JSON.stringify(subscription));

  // or not-recommended directly usage only after ready hook:
  //  const redis = useNitro().redis; // If you've attached it to nitroApp
  // await redis.set(`push:subscription:${userId}`, JSON.stringify(subscription));
}

/**
 * Retrieve a saved Push API subscription associated with a given user ID.
 * @param {string} userId The user ID to look up the subscription for.
 * @returns {Promise<PushSubscription|null>} The associated Push API subscription, or null if none is found.
 */
export async function getSubscription(userId) {
  // const redis = event.context.nitro?.redis
  const redis = await useNitro().redis;
  const subscriptionJson = await redis.get(`push:subscription:${userId}`);
  return subscriptionJson ? JSON.parse(subscriptionJson) : null;

  // const redisStorage = useStorage('redis');
  // const subscriptionJson = await redisStorage.getItem(`push:subscription:${userId}`);
  // return subscriptionJson ? JSON.parse(subscriptionJson) : null;
}
