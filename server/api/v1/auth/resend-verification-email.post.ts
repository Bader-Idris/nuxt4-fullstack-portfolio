import { User } from "../../../models/mongo/index";
import sendVerificationEmail from "../../../utils/sendVerificationEmail";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, locale } = body;

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

  if (user.isVerified) {
    throw createError({
      statusCode: 400,
      statusMessage: "Email already verified",
    });
  }

  // Reuse existing token or generate new one?
  // Generating a new one is safer if the old one was somehow compromised or lost
  // But for "resend" we can just reuse the one we have if it exists
  if (!user.verificationToken) {
     // This shouldn't happen for unverified users, but just in case
     const crypto = await import("node:crypto");
     user.verificationToken = crypto.randomBytes(40).toString("hex");
     await user.save();
  }

  await sendVerificationEmail({
    name: user.name,
    email: user.email,
    // @ts-ignore fix its types
    verificationToken: user.verificationToken,
    origin: useRuntimeConfig().originUrl,
    locale: locale || "en",
  });

  return { message: "Verification email resent" };
});