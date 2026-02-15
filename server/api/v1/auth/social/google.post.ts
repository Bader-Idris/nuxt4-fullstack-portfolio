import { defineEventHandler, readBody, createError, getRequestHeader, getRequestIP } from 'h3';
import { User, Token } from '../../../../models/mongo';
import crypto from 'node:crypto';
import { createTokenUser, attachCookiesToResponse } from '../../../../utils';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    const { accessToken } = body; // Using access token as per CapGO online mode
    
    if (!accessToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing access token'
      });
    }

    // Validate the access token with Google
    const googleValidationRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`);
    if (googleValidationRes.status !== 200) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Google could not verify access token'
      });
    }

    const googleUser = await googleValidationRes.json();
    
    if (!googleUser || !googleUser.email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid Google user data'
      });
    }

    // Find or create user
    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
      user = new User({
        name: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email,
        emailVerified: true,
        provider: 'google',
        providerAccountId: googleUser.sub || googleUser.id,
        avatar: googleUser.picture,
      });
      await user.save();
    } else {
      // Update user with latest Google info
      user.provider = 'google';
      user.providerAccountId = googleUser.sub || googleUser.id;
      user.name = googleUser.name || user.name;
      user.avatar = googleUser.picture || user.avatar;
      user.emailVerified = true;
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
      const ip = getRequestIP(event, { xForwardedFor: true });
      await Token.create({ refreshToken, ip, userAgent, user: user._id });
    }

    attachCookiesToResponse(event, tokenUser, refreshToken);
    // --- END OF UNIFIED LOGIC ---

    return {
      user: {
        name: tokenUser.name,
        userId: tokenUser.userId,
        role: tokenUser.role,
      },
      message: 'Successfully authenticated with Google',
    };
  } catch (error) {
    console.error('Google social auth error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Google authentication failed',
    });
  }
});