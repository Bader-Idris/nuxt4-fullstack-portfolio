import nodemailer from "nodemailer";
import getNodemailerConfig from "./nodemailerConfig";

export default async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const transporter = nodemailer.createTransport(getNodemailerConfig());
  const config = useRuntimeConfig();

  return transporter.sendMail({
    from: config.mailFrom,
    replyTo: config.mailReplyTo,
    to,
    subject,
    html,
    text,
  });
}


