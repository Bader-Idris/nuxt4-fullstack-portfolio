import { saveSubscription } from "../../utils/redisUtils";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  console.log("req.body", body);

  // TODO: does this solve the issue with redis?
  const redis = event.context.redis;
  if (!redis) {
    throw createError({ statusCode: 500, message: "Redis not available" });
  }

  const subscription = body.subscription;
  console.log("subscription", subscription);
  const userId = event.context.user?.userId; // Requires authentication middleware

  if (!userId) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // await saveSubscription(userId, subscription);
  await saveSubscription(redis, userId, subscription);// after setting its type in the Fn itself
  return { success: true };
});
