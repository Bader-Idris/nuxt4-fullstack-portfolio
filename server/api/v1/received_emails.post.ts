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
    // @ts-expect-error Getting Saved to MongoDB
    const newEmail = await ReceivedEmail.create({ name, email, message, ip });

    let emailSent = false;
    try {
      // Send email using the configured mailer
      await sendEmail({
        // from: email,
        to: "Bader Idris <contact@baderidris.com>",
        subject: "New Email from a client",
        html: `
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong> ${message}</p>
        `,
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      });
      emailSent = true;
    } catch (emailError) {
      console.error("Error sending email:", emailError);
    }

    // Return only the specified properties
    // const responseData = {
    //   name: newEmail.name,
    //   email: newEmail.email,
    //   message: newEmail.message,
    //   createdAt: newEmail.createdAt, // Assuming createdAt is automatically handled by your DB
    // };

    if (emailSent) {
      return {
        success: true,
        // data: responseData,
        msg: "Email sent successfully",
      };
    } else {
      return {
        success: true,
        // data: responseData,
        // msg: "Email saved in DB, but failed to send to Dovecot",
        msg: "Email saved in DB",
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
