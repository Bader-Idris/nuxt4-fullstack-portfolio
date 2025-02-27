// server/api/auth/register.post.ts
import crypto from 'node:crypto'
import { User } from '../../../models/mongo/User'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, name, password } = body

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
