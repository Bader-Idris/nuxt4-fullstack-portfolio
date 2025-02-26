import crypto from 'node:crypto'
import { User } from '../../../models/mongo/index'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email } = body

  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please provide valid email',
    })
  }

  const user = await User.findOne({ email })
  if (user) {
    const passwordToken = crypto.randomBytes(70).toString('hex')
    const tenMinutes = 1000 * 60 * 10

    await sendResetPasswordEmail({
      name: user.name,
      email: user.email,
      token: passwordToken,
      origin: useRuntimeConfig().originUrl,
    })

    user.passwordToken = createHash(passwordToken)
    user.passwordTokenExpirationDate = new Date(Date.now() + tenMinutes)
    await user.save()
  }

  return {
    message: 'Please check your email for reset password link',
  }
})
