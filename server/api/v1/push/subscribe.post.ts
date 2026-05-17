import { PushSubscription as MongoPushSubscription } from "../../../models/mongo/PushSubscription";
import { saveSubscription as saveSubscriptionToRedis } from "../../../utils/redisUtils";
import { redisClient } from "../../../plugins/redis";

export default defineEventHandler(async (event) => {
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const { subscription } = await readBody(event);

  console.log(
    "Inspecting user object in subscribe endpoint:",
    event.context.user,
  );

  if (!subscription || !subscription.endpoint) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request: Missing subscription details",
    });
  }

  try {
    await MongoPushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        user: event.context.user.userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      { upsert: true },
    );

    if (redisClient) {
      await saveSubscriptionToRedis(
        redisClient,
        event.context.user.userId,
        subscription,
      );
    }

    return { message: "Subscription saved successfully" };
  } catch (error) {
    console.error("Error saving push subscription:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error: Could not save subscription",
    });
  }
});