import { Token } from "../../../models/mongo/index";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (user) {
    await Token.findOneAndDelete({ user: user.userId });
  }

  deleteCookie(event, "accessToken");
  deleteCookie(event, "refreshToken");

  return { message: "User logged out!" };
});