import { defineEventHandler, sendRedirect } from "h3";
import { stringifyQuery } from "ufo";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = {
    client_id: config.googleClientId,
    redirect_uri: `${config.public.originUrl}/api/v1/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
  };
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${stringifyQuery(
    query,
  )}`;
  return sendRedirect(event, authUrl);
});