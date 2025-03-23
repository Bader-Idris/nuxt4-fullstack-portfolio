import { defineEventHandler, getQuery, sendRedirect } from "h3";
import { User, Token } from "../../../../models/mongo";
import crypto from 'node:crypto'

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
        statusMessage: "Failed to obtain access token",
      });
    }

    const accessToken = tokenData.access_token;

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

    // Find or create user
    let user = await User.findOne({ email: profile.email });
    if (!user) {
      user = new User({
        name: profile.name,
        email: profile.email,
        role: "user",
        isVerified: true,
      });
      await user.save();
    }

    // Generate tokens
    const tokenUser = createTokenUser(user);
    let refreshToken = "";
    const existingToken = await Token.findOne({ user: user._id });

    if (existingToken && existingToken.isValid) {
      refreshToken = existingToken.refreshToken;
    } else {
      refreshToken = crypto.randomBytes(40).toString("hex");
      const userAgent = getRequestHeader(event, "user-agent") || "";
      const ip = getRequestIP(event, { xForwardedFor: true }); // for nginx
      await Token.create({ refreshToken, ip, userAgent, user: user._id });
    }

    attachCookiesToResponse(event, tokenUser, refreshToken);

    const modifiedTokenUser = {
      username: tokenUser.name,
      userId: tokenUser.userId,
      role: tokenUser.role,
    };

    const tokenUserEncoded = encodeURIComponent(JSON.stringify(modifiedTokenUser));
    return sendRedirect(event, `/dashboard?tokenUser=${tokenUserEncoded}`);
  } catch (error) {
    console.error(error);
    return sendRedirect(event, '/login?error=auth_failed');
  }
});
