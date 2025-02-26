import type { NitroApp } from 'nitropack'

export const sendVerificationEmail = async (
  nitroApp: NitroApp,
  {
    name,
    email,
    verificationToken,
  }: {
    name: string
    email: string
    verificationToken: string
  },
) => {
  const verifyUrl = `${
    useRuntimeConfig().originUrl
  }/user/verify-email?token=${verificationToken}&email=${email}`

  await nitroApp.mailer.sendMail({
    to: email,
    subject: 'Email Confirmation',
    html: `
      <h4>Hello, ${name}</h4>
      <p>Please confirm your email by clicking the link below:</p>
      <a href="${verifyUrl}">Verify Email</a>
    `,
  })
}

export const sendResetPasswordEmail = async (
  nitroApp: NitroApp,
  {
    name,
    email,
    token,
  }: {
    name: string
    email: string
    token: string
  },
) => {
  const resetUrl = `${
    useRuntimeConfig().originUrl
  }/user/reset-password?token=${token}&email=${email}`

  await nitroApp.mailer.sendMail({
    to: email,
    subject: 'Reset Password',
    html: `
      <h4>Hello, ${name}</h4>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
    `,
  })
}
