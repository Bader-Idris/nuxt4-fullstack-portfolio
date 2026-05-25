// TODO: better to put in api/v1/user/me.get.ts
import { defineEventHandler } from "h3";

// This is a protected route. We need a way to verify the user.
// We will create a middleware for this endpoint.

export default defineEventHandler(async (event) => {
  const tokenUser = event.context.user;

  if (!tokenUser) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  }

  const { User } = await import("../../../models/mongo/User");
  const user = await User.findById(tokenUser.userId);

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  return {
    user: {
      userId: user._id.toString(),
      name: user.name,
      role: user.role,
      lastActiveChat: user.lastActiveChat,
      settings: user.settings,
    },
  };
});