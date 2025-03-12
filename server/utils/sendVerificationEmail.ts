import { useRuntimeConfig } from "#imports";
import sendEmail from "./sendEmail";

export default async function sendVerificationEmail({
  name,
  email,
  verificationToken,
}: {
  name: string;
  email: string;
  verificationToken: string;
}) {
  const config = useRuntimeConfig();
  const verifyEmail = `${config.public.originUrl}/user/verify-email?verificationToken=${verificationToken}&email=${email}`;
  const unsubscribeLink = `${config.public.originUrl}/user/unsubscribe?email=${email}`;

  // Create a text version that is clear and includes all necessary information
  const textContent = `
Hello, ${name}

Please confirm your email by clicking on the following link:
${verifyEmail}

If you did not request this email, please ignore it.

To unsubscribe from future emails, click here: ${unsubscribeLink}
`;

  // Create the HTML version with proper styling
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; border-radius: 8px; max-width: 600px; margin: auto;">
      <header style="border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px;">
        <h4 style="color: #333;">Hello, ${name}</h4>
        <p style="font-size: 14px; color: #555;">
          <a href="${unsubscribeLink}" style="color: #FF0000; text-decoration: none; font-weight: bold;">Unsubscribe</a>
        </p>
      </header>
      <p style="font-size: 16px; line-height: 1.5;">
        Please confirm your email by clicking on the following link: 
        <a href="${verifyEmail}" style="color: #007BFF; text-decoration: none; font-weight: bold;">Verify Email</a>
      </p>
      <p style="font-size: 14px; color: #555;">
        If you did not request this email, please ignore it.
      </p>
      <footer style="margin-top: 20px; font-size: 12px; color: #777;">
        <p>Thank you for using our service!</p>
      </footer>
    </div>
  `;

  // Send the email with both HTML and text content
  return sendEmail({
    to: email,
    subject: "Email Confirmation",
    html: htmlContent,
    text: textContent,
  });
}
