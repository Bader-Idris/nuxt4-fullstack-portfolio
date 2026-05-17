import crypto from "node:crypto";
import { User, Token } from "../../../models/mongo/index";
import { createTokenUser, attachCookiesToResponse } from "../../../utils";
import {
  validateGoogleToken,
  validateFacebookToken,
  findOrCreateSocialUser,
} from "../../../utils/socialAuth";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password, provider, profile, accessToken, idToken } = body;

  // --- Capacitor Social Login handling ---
  if (provider && provider !== "email") {
    console.log(`--- Capacitor Social Login Start (${provider}) ---`);

    try {
      let socialProfile;
      if (provider === "google") {
        socialProfile = await validateGoogleToken(accessToken, idToken);
      } else if (provider === "facebook") {
        socialProfile = await validateFacebookToken(accessToken);
      } else {
        // For other providers, we might still trust the profile if validation is not yet implemented
        // but it's better to log a warning
        console.warn(
          `Validation not implemented for provider: ${provider}. Using provided profile.`,
        );
        socialProfile = profile;
      }

      if (!socialProfile) {
        throw new Error("Social authentication failed");
      }

      const user = await findOrCreateSocialUser(socialProfile, provider);
      const tokenUser = createTokenUser(user);

      let refreshToken = "";
      const existingToken = await Token.findOne({ user: user._id });

      if (existingToken && existingToken.isValid) {
        refreshToken = existingToken.refreshToken;
      } else {
        if (existingToken) await Token.deleteOne({ _id: existingToken._id });
        refreshToken = crypto.randomBytes(40).toString("hex");
        const userAgent = getRequestHeader(event, "user-agent") || "";
        const ip = getRequestIP(event, { xForwardedFor: true });
        await Token.create({ refreshToken, ip, userAgent, user: user._id });
      }

      attachCookiesToResponse(event, tokenUser, refreshToken);
      console.log("--- Capacitor Social Login Success ---");
      return { user: tokenUser };
    } catch (error: any) {
      console.error(
        `--- Capacitor Social Login Error (${provider}) ---`,
        error,
      );
      throw createError({
        statusCode: 401,
        statusMessage: error.message || "Social authentication failed",
      });
    }
  }
  // --- End of Capacitor Social Login handling ---

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please provide email and password",
    });
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid Credentials",
    });
  }

  // If user exists but has no password, they are likely a social login user
  if (!user.password || user.provider !== "email") {
    throw createError({
      statusCode: 401,
      // Capitalize the provider name for display
      statusMessage: `Please log in using ${user.provider.charAt(0).toUpperCase() + user.provider.slice(1)}.`,
    });
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid Credentials",
    });
  }

  if (!user.isVerified) {
    throw createError({
      statusCode: 401,
      statusMessage: "Please verify your email",
    });
  }

  const tokenUser = createTokenUser(user);
  let refreshToken = "";
  const existingToken = await Token.findOne({ user: user._id });

  if (existingToken) {
    const { isValid } = existingToken;
    if (!isValid) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid Credentials",
      });
    }
    refreshToken = existingToken.refreshToken;
    attachCookiesToResponse(event, tokenUser, refreshToken);
    // attachCookiesToResponse({ res, user: tokenUser, refreshToken }); in express
    // res.status(StatusCodes.OK).json({ user: tokenUser });
    // return;
    return { user: tokenUser };
  }

  refreshToken = crypto.randomBytes(40).toString("hex");
  const userAgent = getRequestHeader(event, "user-agent") || "";
  // const userAgent = req.headers['user-agent']; in express
  const ip = getRequestIP(event, { xForwardedFor: true }); // for nginx

  await Token.create({
    refreshToken,
    ip,
    userAgent,
    user: user._id,
  });

  attachCookiesToResponse(event, tokenUser, refreshToken);
  return { user: tokenUser };

  // expressJs difference
  // attachCookiesToResponse({ res, user: tokenUser, refreshToken });
  // res.status(StatusCodes.OK).json({ user: tokenUser });
});