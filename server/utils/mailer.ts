import { createTransport } from 'nodemailer'
import { useRuntimeConfig } from '#imports'

export const useMailer = () => {
  const config = useRuntimeConfig()

  return createTransport({
    host: 'mail.baderidris.com',
    port: 587,
    secure: false,
    auth: {
      user: config.mailUser,
      pass: config.mailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })
}
