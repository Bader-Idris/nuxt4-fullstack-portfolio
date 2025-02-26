// server/plugins/mailer.ts
import { defineNitroPlugin } from 'nitropack/runtime/plugin'
import { useMailer } from '../utils/mailer'

export default defineNitroPlugin(async (nitroApp) => {
  nitroApp.mailer = useMailer()
})
