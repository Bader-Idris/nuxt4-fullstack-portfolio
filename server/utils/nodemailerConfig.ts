export default function getNodemailerConfig() {
  const config = useRuntimeConfig();
  return {
    host: config.mailHost,
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