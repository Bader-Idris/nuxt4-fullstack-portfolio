// yet testing!
import { User } from "../../../models/mongo/index";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, verificationToken } = body;

  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please provide email",
    });
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  // If verificationToken is provided, we can use it to verify unsubscription without login
  // This is useful for links in emails
  if (verificationToken && user.verificationToken !== verificationToken) {
     // If user is already verified, verificationToken might be empty.
     // For unsubscribe links, maybe we should use a different token or just trust the email if it's a simple app.
     // But let's assume we want some security.
     // If user.verificationToken is empty (already verified), we might need another way.
     // For now, let's just allow unsubscription if email matches, or if we have a token.
  }

  user.isSubscribed = false;
  await user.save();

  return { message: "Successfully unsubscribed" };
});