import { User } from '../../../models/mongo/index'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token, email, password } = body

  if (!token || !email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please provide all values',
    })
  }

  const user = await User.findOne({ email })
  if (user) {
    const currentDate = new Date()
    if (
      user.passwordToken === createHash(token)
      && user.passwordTokenExpirationDate
      && user.passwordTokenExpirationDate > currentDate
    ) {
      user.password = password
      user.passwordToken = null
      user.passwordTokenExpirationDate = null
      await user.save()
    }
  }

  return { message: 'Password reset successful' }
})
