import sendEmail from "./sendEmail";

type EmailContent = {
  subject: string;
  greeting: string;
  body: string;
  buttonText: string;
  ignoreHint: string;
  thankYou: string;
};

const translations: Record<string, EmailContent> = {
  en: {
    subject: "Confirm Your Email",
    greeting: "Hello",
    body: "Thank you for joining our platform. Please confirm your email by clicking the button below to activate your account:",
    buttonText: "Verify Email",
    ignoreHint: "If you did not request this email, please ignore it.",
    thankYou: "Thank you for using our service!",
  },
  ar: {
    subject: "تأكيد بريدك الإلكتروني",
    greeting: "مرحباً",
    body: "شكراً لانضمامك إلينا. يرجى تأكيد بريدك الإلكتروني بالنقر على الزر أدناه لتفعيل حسابك:",
    buttonText: "تأكيد البريد",
    ignoreHint: "إذا لم تطلب هذا البريد الإلكتروني، يرجى تجاهله.",
    thankYou: "شكراً لاستخدامك خدمتنا!",
  },
  es: {
    subject: "Confirma tu correo electrónico",
    greeting: "Hola",
    body: "Gracias por unirte a nuestra plataforma. Por favor, confirma tu correo electrónico haciendo clic en el botón de abajo para activar tu cuenta:",
    buttonText: "Verificar correo",
    ignoreHint: "Si no solicitaste este correo, por favor ignóralo.",
    thankYou: "¡Gracias por usar nuestro servicio!",
  },
};

export default async function sendVerificationEmail({
  name,
  email,
  verificationToken,
  locale = "en",
}: {
  name: string;
  email: string;
  verificationToken: string;
  origin?: string;
  locale?: string;
}) {
  const config = useRuntimeConfig();
  
  // Construct localized URL path
  const langPath = locale === "en" ? "" : `/${locale}`;
  const verifyEmail = `${config.public.originUrl}${langPath}/user/verify-email?verificationToken=${verificationToken}&email=${email}`;
  
  // Normalize locale for translations
  const userLocale = translations[locale] ? locale : "en";
  const content = translations[userLocale];
  const isRtl = userLocale === "ar";

  const textContent = `
${content.greeting}, ${name}

${content.body}
${verifyEmail}

${content.ignoreHint}
`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="${userLocale}" dir="${isRtl ? "rtl" : "ltr"}">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e1e8ed; }
        .header { background-color: #011221; color: #ffffff; padding: 30px; text-align: center; }
        .content { padding: 40px; text-align: ${isRtl ? "right" : "left"}; line-height: 1.6; color: #333333; }
        .button-wrapper { text-align: center; margin: 40px 0; }
        .button { background-color: #fea55f; color: #011221 !important; padding: 15px 35px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; transition: background-color 0.3s ease; }
        .footer { padding: 25px; background-color: #f8fafc; border-top: 1px solid #edf2f7; text-align: center; font-size: 14px; color: #718096; }
        h1 { margin: 0; font-size: 24px; }
        p { margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${content.subject}</h1>
        </div>
        <div class="content">
          <p>${content.greeting} <strong>${name}</strong>,</p>
          <p>${content.body}</p>
          <div class="button-wrapper">
            <a href="${verifyEmail}" class="button">${content.buttonText}</a>
          </div>
          <p style="font-size: 14px; color: #718096;">${content.ignoreHint}</p>
        </div>
        <div class="footer">
          <p>${content.thankYou}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: content.subject,
    html: htmlContent,
    text: textContent,
  });
}