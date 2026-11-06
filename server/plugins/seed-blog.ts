import { ensureWelcomePost } from "../utils/ensureWelcomePost";

export default defineNitroPlugin(async (nitroApp) => {
  // Dev keeps the convenience of seeding at server startup. In production the
  // Welcome post is created lazily by the first authorized admin request
  // (server/middleware/auth.ts), so it is attributed to a real account and
  // never to a synthetic user. ENABLE_AUTO_SEED=true restores the old
  // startup behavior if ever needed.
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && process.env.ENABLE_AUTO_SEED !== "true") return;

  // Run in background to prevent blocking server startup if DB is slow/unreachable
  // This avoids the "frozen" state the user experienced.
  (async () => {
    await ensureWelcomePost();
  })();
});
