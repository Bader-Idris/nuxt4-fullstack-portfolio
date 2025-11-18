import { defineEventHandler, readBody, sendRedirect } from "h3";
import { User, Token } from "../../../../models/mongo";
import crypto from 'node:crypto';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { provider, profile, accessToken, idToken } = body;

    if (!provider || !profile) {
      throw createError({
        statusCode: 400,
        statusMessage: "Provider and profile are required",
      });
    }

    // Find or create user based on the provider
    let user = await User.findOne({ email: profile.email });
    
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
      // Update existing user with provider info if needed
      if (user.provider !== provider) {
        user.provider = provider;
        user.password = undefined; // Clear password if they switch to OAuth
        await user.save();
      }
    }

    // --- UNIFIED TOKEN AND COOKIE LOGIC ---
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
    // --- END OF UNIFIED LOGIC ---

    // Return user data instead of redirecting for the Capacitor flow
    return { user: tokenUser };

  } catch (error) {
    console.error("Social auth callback error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Social authentication failed",
    });
  }
});