import {  readBody, getRequestIP, createError } from "h3";
import { ReceivedEmail } from "../../models/mongo/index";

export default defineEventHandler(async (event) => {
  // const config = useRuntimeConfig();
  const body = await readBody(event);

  // Validation
  const { name, email, message } = body;

  if (!name || !email || !message) {
    throw createError({
      statusCode: 400,
      data: { msg: "Missing required fields" },
    });
  }

  // Email validation
  if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email)) {
    throw createError({
      statusCode: 400,
      data: { msg: "Invalid email format" },
    });
  }

  if (message.length > 5000) {
    throw createError({
      statusCode: 400,
      data: { msg: "Message is too long" },
    });
  }

  // const ip =
  //   getRequestHeader(event, "x-forwarded-for") ||
  //   event.node.req.socket.remoteAddress;
  const ip = getRequestIP(event, { xForwardedFor: true }); // for nginx

  try {
    // Save to MongoDB
    const newEmail = await ReceivedEmail.create({ name, email, message, ip });

    let emailSent = false;
    try {
      // Send email using the configured mailer
      await event.context.mailer.sendMail({
        from: email,
        to: "Bader Idris <contact@baderidris.com>",
        subject: "New Email from a client",
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      });
      emailSent = true;
    } catch (emailError) {
      console.error("Error sending email:", emailError);
    }

    if (emailSent) {
      return {
        success: true,
        data: newEmail,
        msg: "Email saved and sent successfully",
      };
    } else {
      return {
        success: true,
        data: newEmail,
        msg: "Email saved in DB, but failed to send to Dovecot",
      };
    }
  } catch (error) {
    console.error("Error processing request:", error);
    throw createError({
      statusCode: 500,
      data: { msg: "Internal server error" },
    });
  }
});
