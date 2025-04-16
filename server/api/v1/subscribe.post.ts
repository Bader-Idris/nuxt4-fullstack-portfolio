import { saveSubscription } from "../../utils/redis";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const subscription = body.subscription;
  const userId = event.context.user?.userId; // Requires authentication middleware

  if (!userId) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  await saveSubscription(userId, subscription);
  return { success: true };
});
