// import { ReceivedEmail } from "@server/models/mongo/index.ts";
import { defineEventHandler, readBody } from 'h3'
import { ReceivedEmail } from '../../models/mongo/index'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  // Validation
  const { name, email, message } = body

  if (!name || !email || !message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields', // TODO: is it json??
    })
  }

  // Email validation
  if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid email format',
    })
  }

  if (message.length > 5000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message is too long',
    })
  }

  // Get IP address
  const ip
    = getRequestHeader(event, 'x-forwarded-for')
      || event.node.req.socket.remoteAddress

  try {
    // Save to MongoDB
    const newEmail = await ReceivedEmail.create({ name, email, message, ip })

    // Send email using the configured mailer
    await event.context.mailer.sendMail({
      from: email,
      to: 'Bader Idris <contact@baderidris.com>',
      subject: 'New Email from a client',
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
    })

    return { success: true, data: newEmail }
  }
  catch (error) {
    console.error('Error processing request:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }
})
