import { saveSubscription } from "../../utils/redis";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  console.log("req.body", body);

  const subscription = body.subscription;
  console.log("subscription", subscription);
  const userId = event.context.user?.userId; // Requires authentication middleware

  if (!userId) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  await saveSubscription(userId, subscription);
  return { success: true };
});
