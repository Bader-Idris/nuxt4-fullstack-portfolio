import {
  defineEventHandler,
  readBody,
  sendRedirect,
  createError,
  getRequestHeader,
  getRequestIP,
} from "h3";
import { User, Token } from "../../../../models/mongo";
import crypto from "node:crypto";
import { createTokenUser, attachCookiesToResponse } from "../../../../utils";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { provider, profile, accessToken, idToken } = body;
    console.log("--- Social Auth Callback Start ---");
    console.log("Provider:", provider);
    console.log("Profile:", JSON.stringify(profile, null, 2));

    if (!provider || !profile) {
      console.error("Error: Provider and profile are required");
      throw createError({
        statusCode: 400,
        statusMessage: "Provider and profile are required",
      });
    }

    let user = await User.findOne({ email: profile.email });
    if (user) {
      console.log(
        "Found existing user:",
        user.email,
        "Current Provider:",
        user.provider,
      );
    } else {
      console.log("Creating new user for:", profile.email);
    }

    if (!user) {
      // Create new user
      user = new User({
        name: profile.name || profile.displayName,
        email: profile.email,
        provider, // Set the provider (google, facebook, etc.)
        role: "user",
        isVerified: true, // OAuth users are considered verified
      });
      await user.save();
    } else {
      if (user.provider !== provider) {
        console.log(`Updating provider from ${user.provider} to ${provider}`);
        user.provider = provider;
        user.password = undefined;
        user.isVerified = true;
        await user.save();
      }
    }

    const tokenUser = createTokenUser(user);
    let refreshToken = "";
    const existingToken = await Token.findOne({ user: user._id });

    if (existingToken && existingToken.isValid) {
      console.log("Using existing refresh token");
      refreshToken = existingToken.refreshToken;
    } else {
      if (existingToken) {
        await Token.deleteOne({ _id: existingToken._id });
      }
      refreshToken = crypto.randomBytes(40).toString("hex");
      const userAgent = getRequestHeader(event, "user-agent") || "";
      const ip = getRequestIP(event, { xForwardedFor: true });
      await Token.create({ refreshToken, ip, userAgent, user: user._id });
      console.log("New refresh token saved to DB");
    }

    console.log("Attaching cookies...");
    attachCookiesToResponse(event, tokenUser, refreshToken);

    console.log("--- Social Auth Callback Success ---");
    return { user: tokenUser };
  } catch (error: any) {
    console.error("--- Social auth callback error CRASH ---");
    console.error("Error details:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Social authentication failed",
    });
  }
});