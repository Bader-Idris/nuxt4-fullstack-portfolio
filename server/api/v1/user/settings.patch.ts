import { User } from "../../../models/mongo/User";

export default defineEventHandler(async (event) => {
  const user = event.context.user;

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const body = await readBody(event);
  const { settings } = body;

  if (!settings) {
    throw createError({
      statusCode: 400,
      statusMessage: "Settings are required",
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    user.userId,
    { $set: { settings } },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  return {
    success: true,
    settings: updatedUser.settings,
  };
});
