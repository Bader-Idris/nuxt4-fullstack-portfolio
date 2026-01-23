import { defineEventHandler, readBody } from "h3";
import { User, Token } from "../../../models/mongo";
import crypto from 'node:crypto';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { serverAuthCode, platform } = body;

    if (!serverAuthCode) {
      throw createError({
        statusCode: 400,
        statusMessage: "Server auth code is required",
      });
    }

    const config = useRuntimeConfig();
    
    // Exchange the serverAuthCode for tokens
    let clientId, clientSecret;
    if (platform === 'android') {
      clientId = config.googleAndroidClientId;
      clientSecret = config.googleAndroidClientSecret;
    } else if (platform === 'ios') {
      clientId = config.googleIOSClientId;
      clientSecret = config.googleIOSClientSecret;
    } else {
      // For web fallback
      clientId = config.googleWebClientId;
      clientSecret = config.googleWebClientSecret;
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: serverAuthCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: "postmessage", // For offline access
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw createError({
        statusCode: 400,
        statusMessage: `Failed to exchange auth code for tokens: ${tokenData.error_description || 'Unknown error'}`,
      });
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token; // This is the refresh token for offline access

    // Fetch user profile
    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
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
        provider: 'google', // Set the provider
        role: "user",
        isVerified: true, // OAuth users are considered verified
        refreshToken: refreshToken, // Store the refresh token for offline access
      });
      await user.save();
    } else {
      // If user exists but logs in with Google for the first time, update provider
      if (user.provider !== 'google') {
        user.provider = 'google';
        // You might want to clear password fields if they switch to OAuth
        user.password = undefined;
      }
      // Update the refresh token for offline access
      user.refreshToken = refreshToken;
      await user.save();
    }

    // --- UNIFIED TOKEN AND COOKIE LOGIC ---
    const tokenUser = createTokenUser(user);
    let finalRefreshToken = "";
    const existingToken = await Token.findOne({ user: user._id });

    if (existingToken && existingToken.isValid) {
      finalRefreshToken = existingToken.refreshToken;
    } else {
      if (existingToken) {
        await Token.deleteOne({ _id: existingToken._id });
      }
      finalRefreshToken = crypto.randomBytes(40).toString("hex");
      const userAgent = getRequestHeader(event, "user-agent") || "";
      const ip = getRequestIP(event, { xForwardedFor: true }); // for nginx
      await Token.create({ refreshToken: finalRefreshToken, ip, userAgent, user: user._id });
    }

    // Return JWT for the client to use
    return { 
      jwt: tokenUser.token,
      refreshToken: finalRefreshToken,
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
        provider: user.provider,
      }
    };

  } catch (error) {
    console.error("Google offline auth error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Google offline authentication failed",
    });
  }
});