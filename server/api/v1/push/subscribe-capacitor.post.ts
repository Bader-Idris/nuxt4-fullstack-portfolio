import { CapacitorSubscription } from "../../../models/mongo/CapacitorSubscription";
import { saveCapacitorSubscription as saveCapacitorSubscriptionToRedis } from "../../../utils/redisUtils";
import { redisClient } from "../../../plugins/redis";

export default defineEventHandler(async (event) => {
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const { token, platform } = await readBody(event);

  if (!token || !platform) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request: Missing token or platform details",
    });
  }

  try {
    await CapacitorSubscription.findOneAndUpdate(
      { token },
      {
        user: event.context.user.userId,
        token,
        platform,
      },
      { upsert: true },
    );

    if (redisClient) {
      await saveCapacitorSubscriptionToRedis(
        redisClient,
        event.context.user.userId,
        { token, platform },
      );
    }

    return { message: "Capacitor subscription saved successfully" };
  } catch (error) {
    console.error("Error saving Capacitor subscription:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error: Could not save subscription",
    });
  }
});