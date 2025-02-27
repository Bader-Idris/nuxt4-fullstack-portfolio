import crypto from 'node:crypto'
import { User, Token } from '../../../models/mongo/index'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please provide email and password',
    })
  }

  const user = await User.findOne({ email })
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid Credentials',
    })
  }

  const isPasswordCorrect = await user.comparePassword(password)
  if (!isPasswordCorrect) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid Credentials',
    })
  }

  if (!user.isVerified) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Please verify your email',
    })
  }

  const tokenUser = createTokenUser(user)
  let refreshToken = ''
  const existingToken = await Token.findOne({ user: user._id })

  if (existingToken) {
    const { isValid } = existingToken;
    if (!isValid) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid Credentials",
      });
    }
    refreshToken = existingToken.refreshToken;
    attachCookiesToResponse(event, tokenUser, refreshToken);
    // attachCookiesToResponse({ res, user: tokenUser, refreshToken }); in express
    // res.status(StatusCodes.OK).json({ user: tokenUser });
    // return;
    return { user: tokenUser };
  }

  refreshToken = crypto.randomBytes(40).toString('hex')
  const userAgent = getRequestHeader(event, 'user-agent') || ''
  // const userAgent = req.headers['user-agent']; in express
  const ip =
    getRequestHeader(event, "x-forwarded-for") ||
    event.node.req.socket.remoteAddress ||
    ""; // TODO: test if proper with nginx

  await Token.create({
    refreshToken,
    ip,
    userAgent,
    user: user._id,
  });

  attachCookiesToResponse(event, tokenUser, refreshToken);
  return { user: tokenUser };

  // expressJs difference
  // attachCookiesToResponse({ res, user: tokenUser, refreshToken });
  // res.status(StatusCodes.OK).json({ user: tokenUser });
})
