// TODO: better to put in api/v1/user/me.get.ts
import { defineEventHandler } from "h3";

// This is a protected route. We need a way to verify the user.
// We will create a middleware for this endpoint.

export default defineEventHandler(async (event) => {
  // The user object should be attached to the event context by a server middleware
  // that validates the accessToken cookie.
  const user = event.context.user;

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  }

  return {
    user: {
      userId: user.userId,
      name: user.name,
      role: user.role,
    },
  };
});