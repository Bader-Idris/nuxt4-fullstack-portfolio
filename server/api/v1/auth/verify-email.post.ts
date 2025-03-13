import { User } from "../../../models/mongo/index";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { verificationToken, email } = body;

  const user = await User.findOne({ email });

  if (!user || user.verificationToken !== verificationToken) {
    throw createError({
      statusCode: 401,
      // statusMessage: "Unauthorized",
      message: "Verification Failed",
      data: { msg: "Verification Failed" },
    });
  }

  user.isVerified = true;
  user.verified = new Date();
  user.verificationToken = "";
  await user.save();

  return { message: "Email Verified" };
});
