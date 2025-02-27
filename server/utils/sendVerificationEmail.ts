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
  const verifyEmail = `${config.public.originUrl}/user/verify-email?token=${verificationToken}&email=${email}`;

  const message = `<p>Please confirm your email by clicking on the following link: 
  <a href="${verifyEmail}">Verify Email</a> </p>`;

  return sendEmail({
    to: email,
    subject: "Email Confirmation",
    html: `<h4> Hello, ${name}</h4>
    ${message}
    `,
  });
}
