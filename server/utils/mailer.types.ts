import type { Transporter } from 'nodemailer'

declare module 'nitropack' {
  interface NitroApp {
    mailer: Transporter
  }
}
