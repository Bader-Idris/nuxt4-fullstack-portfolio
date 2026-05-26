import { readBody, getRequestIP, createError } from "h3";
import { ReceivedEmail } from "../../models/mongo/index";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  email: z.string()
    .email("Please provide a valid email address"),
  message: z.string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message is too long (max 5000 characters)"),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Zod Validation
  const validation = contactSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Validation Failed",
      data: { 
        msg: validation.error.issues[0].message,
        errors: validation.error.issues 
      },
    });
  }

  const { name, email, message } = validation.data;
  const ip = getRequestIP(event, { xForwardedFor: true }) || "0.0.0.0";

  try {
    // Save to Database (Mongoose)
    const newEmail = await ReceivedEmail.create({ 
      name, 
      email, 
      message, 
      ip 
    });

    let emailSent = false;
    try {
      // Send email notification to Admin
      await sendEmail({
        to: "Bader Idris <contact@baderidris.com>",
        subject: `New Contact Message from ${name}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2563eb;">New Portfolio Message</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p><strong>Message:</strong></p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #2563eb;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="font-size: 0.8em; color: #777; margin-top: 20px;">IP Address: ${ip}</p>
          </div>
        `,
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}\nIP: ${ip}`,
      });
      emailSent = true;
    } catch (emailError) {
      console.error("[Contact API] Error sending email:", emailError);
    }

    return {
      success: true,
      msg: emailSent ? "Message sent successfully!" : "Message saved, but notification failed.",
      data: {
        id: (newEmail as any)._id,
        received: true
      }
    };
  } catch (error: any) {
    console.error("[Contact API] Processing Error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { msg: "We encountered an error processing your message. Please try again later." },
    });
  }
});
