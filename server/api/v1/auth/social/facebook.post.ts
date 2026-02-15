import { defineEventHandler, readBody, createError, getRequestHeader, getRequestIP } from 'h3';
import { User, Token } from '../../../../models/mongo';
import crypto from 'node:crypto';
import { createTokenUser, attachCookiesToResponse } from '../../../../utils';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    const { accessToken } = body;
    
    if (!accessToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing access token'
      });
    }

    // Validate the Facebook access token
    const fbValidationRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );

    if (!fbValidationRes.ok) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid Facebook access token'
      });
    }

    const fbUser = await fbValidationRes.json();

    if (!fbUser || !fbUser.email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid Facebook user data'
      });
    }

    // Find or create user
    let user = await User.findOne({ email: fbUser.email });

    if (!user) {
      user = new User({
        name: fbUser.name,
        email: fbUser.email,
        emailVerified: true,
        provider: 'facebook',
        providerAccountId: fbUser.id,
        avatar: fbUser.picture?.data?.url,
      });
      await user.save();
    } else {
      // Update user with latest Facebook info
      user.provider = 'facebook';
      user.providerAccountId = fbUser.id;
      user.name = fbUser.name || user.name;
      user.avatar = fbUser.picture?.data?.url || user.avatar;
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
      message: 'Successfully authenticated with Facebook',
    };
  } catch (error) {
    console.error('Facebook social auth error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Facebook authentication failed',
    });
  }
});