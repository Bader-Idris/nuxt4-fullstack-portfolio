import { useRuntimeConfig } from "#imports";

export default function getNodemailerConfig() {
  const config = useRuntimeConfig();
  return {
    host: "mail.baderidris.com",
    port: 587,
    secure: false,
    auth: {
      user: config.mailUser,
      pass: config.mailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  };
}


