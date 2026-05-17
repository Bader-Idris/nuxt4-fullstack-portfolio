import crypto from "node:crypto";
import { Token } from "../../../../models/mongo/index";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication failed",
    });
  }

  const refreshToken = crypto.randomBytes(40).toString("hex");
  const ip =
    getRequestHeader(event, "x-forwarded-for") ||
    event.node.req.socket.remoteAddress ||
    "";
  const userAgent = getRequestHeader(event, "user-agent") || "";

  await Token.findOneAndUpdate(
    { user: user._id },
    {
      refreshToken,
      ip,
      userAgent,
      isValid: true,
    },
    { upsert: true, new: true },
  );

  const origin = useRuntimeConfig().originUrl;
  return sendRedirect(
    event,
    `${origin}/auth/success?token=${encodeURIComponent(refreshToken)}`,
  );
});