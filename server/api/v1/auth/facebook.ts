import { defineEventHandler, sendRedirect } from "h3";
import { stringifyQuery } from "ufo";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = {
    client_id: config.facebookClientId,
    redirect_uri: `${config.public.originUrl}/api/v1/auth/facebook/callback`,
    response_type: "code",
    scope: "email public_profile",
  };
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${stringifyQuery(
    query
  )}`;
  return sendRedirect(event, authUrl);
});
