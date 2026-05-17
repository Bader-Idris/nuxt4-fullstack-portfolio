import { defineEventHandler, getQuery, sendRedirect } from "h3";
import { User, Token } from "../../../../models/mongo";
import crypto from "node:crypto";

// Assuming createTokenUser and attachCookiesToResponse are auto-imported or available in the context
// You might need to import them explicitly if they are not auto-imported, e.g.:
// import { createTokenUser, attachCookiesToResponse } from '../../../../utils/auth';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const code = query.code as string;

  try {
    if (!code) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing authorization code",
      });
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: `${config.public.originUrl}/api/v1/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw createError({
        statusCode: 400,
        statusMessage: `Failed to obtain access token: ${tokenData.error_description || "Unknown error"}`,
      });
    }

    const accessToken = tokenData.access_token;

    // Fetch user profile
    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const profile = await profileResponse.json();
    if (!profileResponse.ok) {
      throw createError({
        statusCode: 400,
        statusMessage: "Failed to fetch user profile",
      });
    }

    // Find or create user with the 'google' provider
    let user = await User.findOne({ email: profile.email });
    if (!user) {
      user = new User({
        name: profile.name,
        email: profile.email,
        provider: "google", // Set the provider
        role: "user",
        isVerified: true, // OAuth users are considered verified
      });
      await user.save();
    } else {
      // If user exists but logs in with Google for the first time, update provider
      if (user.provider !== "google") {
        user.provider = "google";
        // You might want to clear password fields if they switch to OAuth
        user.password = undefined;
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
      const ip = getRequestIP(event, { xForwardedFor: true }); // for nginx
      await Token.create({ refreshToken, ip, userAgent, user: user._id });
    }

    attachCookiesToResponse(event, tokenUser, refreshToken);
    // --- END OF UNIFIED LOGIC ---

    // Secure, clean redirect to the auth callback page on the client.
    return sendRedirect(event, "/auth/callback");
  } catch (error) {
    console.error("Google auth callback error:", error);
    return sendRedirect(event, "/login?error=google_auth_failed");
  }
});