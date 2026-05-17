import crypto from 'node:crypto'
import { User, Token } from '../../../models/mongo/index'
import { createTokenUser, attachCookiesToResponse } from '../../../utils'
import { validateGoogleToken, validateFacebookToken, findOrCreateSocialUser } from '../../../utils/socialAuth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, name, password, provider, profile, accessToken, idToken } = body

  // --- Capacitor Social Login handling ---
  if (provider && provider !== 'email') {
    console.log(`--- Capacitor Social Registration Start (${provider}) ---`);
    
    try {
      let socialProfile;
      if (provider === 'google') {
        socialProfile = await validateGoogleToken(accessToken, idToken);
      } else if (provider === 'facebook') {
        socialProfile = await validateFacebookToken(accessToken);
      } else {
        console.warn(`Validation not implemented for provider: ${provider}. Using provided profile.`);
        socialProfile = profile;
      }

      if (!socialProfile) {
        throw new Error('Social authentication failed');
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
      console.log(`--- Capacitor Social Registration Success (${provider}) ---`);
      return {
        user: tokenUser,
        message: `Successfully authenticated with ${provider}`,
      }
    } catch (error: any) {
      console.error(`--- Capacitor Social Registration Error (${provider}) ---`, error);
      throw createError({
        statusCode: 401,
        statusMessage: error.message || 'Social authentication failed',
      });
    }
  }
  // --- End of Capacitor Social Login handling ---

  const emailAlreadyExists = await User.findOne({ email })
  if (emailAlreadyExists) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email already exists',
    })
    /*
    if (emailAlreadyExists) {
      return {
        statusCode: 400,
        body: { message: "Email already exists" },
      };
    }
    */
  }

  const isFirstAccount = (await User.countDocuments({})) === 0
  const role = isFirstAccount ? 'admin' : 'user'
  const verificationToken = crypto.randomBytes(40).toString('hex')

  const user = await User.create({
    name,
    email,
    password,
    role,
    verificationToken,
  })

  await sendVerificationEmail({
    name: user.name,
    email: user.email,
    // @ts-ignore fix its types
    verificationToken: user.verificationToken,
    origin: useRuntimeConfig().originUrl,
  })

  return {
    statusCode: 201,
    message: 'Success! Please check your email to verify account',
  }
})
