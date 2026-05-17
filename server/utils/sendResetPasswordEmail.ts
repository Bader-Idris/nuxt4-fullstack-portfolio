export default async function sendResetPasswordEmail({
  name,
  email,
  token,
}: {
  name: string;
  email: string;
  token: string;
}) {
  const config = useRuntimeConfig();
  const resetURL = `${config.public.originUrl}/user/reset-password?token=${token}&email=${email}`;

  const htmlMessage = `
    <h4>Hello, ${name}</h4>
    <p>Please reset your password by clicking on the following link:</p>
    <p><a href="${resetURL}" style="color: #007bff; text-decoration: none;">Reset Password</a></p>
    <p>If you did not request this, please ignore this email.</p>
  `;

  const textMessage = `
    Hello, ${name},\n\n
    Please reset your password by visiting the following link:\n
    ${resetURL}\n\n
    If you did not request this, please ignore this email.
  `;

  return sendEmail({
    to: email,
    subject: "Reset Password",
    html: htmlMessage,
    text: textMessage, // Optional: Add a plain text version for email clients that don't support HTML
  });
}