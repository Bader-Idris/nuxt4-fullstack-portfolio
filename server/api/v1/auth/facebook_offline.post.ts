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
    
    // For Facebook, we typically don't use serverAuthCode in the same way as Google
    // Instead, we'll use the access token that we get from the client
    // But for consistency with the offline approach, we'll assume the client sends us
    // an access token that has the appropriate offline permissions
    
    // In a real implementation, you might need to exchange a code for an access token
    // depending on how your Facebook SDK is configured
    const accessToken = serverAuthCode; // In this case, we treat the sent code as the access token
    
    // Fetch user profile from Facebook
    const profileResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
    );
    const profile = await profileResponse.json();
    if (!profileResponse.ok) {
      throw createError({
        statusCode: 400,
        statusMessage: `Failed to fetch user profile: ${profile.error?.message || 'Unknown error'}`,
      });
    }

    // Find or create user with the 'facebook' provider
    let user = await User.findOne({ email: profile.email });
    if (!user) {
      user = new User({
        name: profile.name,
        email: profile.email,
        provider: 'facebook', // Set the provider
        role: "user",
        isVerified: true, // OAuth users are considered verified
        refreshToken: accessToken, // Store the access token for future use
      });
      await user.save();
    } else {
      // If user exists but logs in with Facebook for the first time, update provider
      if (user.provider !== 'facebook') {
        user.provider = 'facebook';
        user.password = undefined; // Clear password if they switch to OAuth
      }
      // Update the access token for future use
      user.refreshToken = accessToken;
      await user.save();
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

    // Return JWT for the client to use
    return { 
      jwt: tokenUser.token,
      refreshToken,
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
        provider: user.provider,
      }
    };

  } catch (error) {
    console.error("Facebook offline auth error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Facebook offline authentication failed",
    });
  }
});