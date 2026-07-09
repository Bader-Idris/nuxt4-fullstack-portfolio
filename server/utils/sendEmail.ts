import nodemailer from "nodemailer";
import getNodemailerConfig from "./nodemailerConfig";

export default async function sendEmail({
  to,
  subject,
  html,
  text,
  unsubscribeUrl,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  unsubscribeUrl?: string;
}) {
  const transporter = nodemailer.createTransport(getNodemailerConfig());
  const config = useRuntimeConfig();

  const headers: Record<string, string> = {};
  let finalHtml = html;
  let finalTxt = text;

  if (unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    headers["Precedence"] = "bulk";

    if (!html.includes(unsubscribeUrl)) {
      finalHtml = `${html}
<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
<p style="font-size: 12px; color: #718096; text-align: center; font-family: sans-serif; line-height: 1.5;">
  You are receiving this email because you subscribed to updates. <br />
  If you no longer wish to receive these emails, you can 
  <a href="${unsubscribeUrl}" style="color: #3182ce; text-decoration: underline;">unsubscribe here</a>.
</p>`;
    }

    if (text && !text.includes(unsubscribeUrl)) {
      finalTxt = `${text}\n\n---\nTo unsubscribe from these emails, visit: ${unsubscribeUrl}`;
    }
  }

  return transporter.sendMail({
    from: config.mailFrom,
    replyTo: config.mailReplyTo,
    to,
    subject,
    html: finalHtml,
    text: finalTxt,
    headers,
  });
}