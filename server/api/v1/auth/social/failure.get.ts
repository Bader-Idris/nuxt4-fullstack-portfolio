export default defineEventHandler((event) => {
  const origin = useRuntimeConfig().originUrl;
  return sendRedirect(event, `${origin}/login?error=social_auth_failed`);
});