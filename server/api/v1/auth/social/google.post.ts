import { defineEventHandler, readBody, createError, getRequestHeader, getRequestIP } from 'h3';
import { Token } from '../../../../models/mongo';
import crypto from 'node:crypto';
import { createTokenUser, attachCookiesToResponse } from '../../../../utils';
import { validateGoogleToken, findOrCreateSocialUser } from '../../../../utils/socialAuth';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    console.log('--- Google Social Auth Start ---');
    console.log('Request Body:', JSON.stringify(body, null, 2));
    
    const { accessToken, idToken } = body;
    
    if (!accessToken && !idToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing authentication tokens'
      });
    }

    const profile = await validateGoogleToken(accessToken, idToken);
    const user = await findOrCreateSocialUser(profile, 'google');

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
    
    console.log('--- Google Social Auth Success ---');
    return {
      user: {
        name: tokenUser.name,
        userId: tokenUser.userId,
        role: tokenUser.role,
      },
      message: 'Successfully authenticated with Google',
    };
  } catch (error: any) {
    console.error('--- Google social auth error ---');
    console.error(error);
    
    throw createError({
      statusCode: error.statusCode || 401,
      statusMessage: error.statusMessage || error.message || 'Google authentication failed',
    });
  }
});
