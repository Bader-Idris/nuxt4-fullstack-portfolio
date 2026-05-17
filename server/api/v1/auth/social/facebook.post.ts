import {
  defineEventHandler,
  readBody,
  createError,
  getRequestHeader,
  getRequestIP,
} from "h3";
import { Token } from "../../../../models/mongo";
import crypto from "node:crypto";
import { createTokenUser, attachCookiesToResponse } from "../../../../utils";
import {
  validateFacebookToken,
  findOrCreateSocialUser,
} from "../../../../utils/socialAuth";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    console.log("--- Facebook Social Auth Start ---");
    console.log("Request Body:", JSON.stringify(body, null, 2));

    const { accessToken } = body;

    if (!accessToken) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing access token",
      });
    }

    const profile = await validateFacebookToken(accessToken);
    const user = await findOrCreateSocialUser(profile, "facebook");

    const tokenUser = createTokenUser(user);
    let refreshToken = "";
    const existingToken = await Token.findOne({ user: user._id });

    if (existingToken && existingToken.isValid) {
      refreshToken = existingToken.refreshToken;
    } else {
      if (existingToken) {
        await Token.deleteOne({ _id: existingToken._id });
      }
      refreshToken = crypto.randomBytes(40).toString("hex");
      const userAgent = getRequestHeader(event, "user-agent") || "";
      const ip = getRequestIP(event, { xForwardedFor: true });
      await Token.create({ refreshToken, ip, userAgent, user: user._id });
    }

    attachCookiesToResponse(event, tokenUser, refreshToken);

    console.log("--- Facebook Social Auth Success ---");
    return {
      user: {
        name: tokenUser.name,
        userId: tokenUser.userId,
        role: tokenUser.role,
      },
      message: "Successfully authenticated with Facebook",
    };
  } catch (error: any) {
    console.error("--- Facebook social auth error ---");
    console.error(error);
    throw createError({
      statusCode: error.statusCode || 401,
      statusMessage:
        error.statusMessage ||
        error.message ||
        "Facebook authentication failed",
    });
  }
});