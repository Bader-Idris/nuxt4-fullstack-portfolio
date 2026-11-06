import type { Redis } from "ioredis";

// Fixed-window rate limiter backed by Redis. Fails open: if Redis is
// unreachable, requests are allowed so a cache outage cannot take the API down.
// Limits are per minute and tunable via env without a rebuild.

const GENERAL_API_LIMIT = Number(process.env.RATE_LIMIT_API_PER_MINUTE || 240);
const AUTH_LIMIT = Number(process.env.RATE_LIMIT_AUTH_PER_MINUTE || 10);
const COMMENT_LIMIT = Number(process.env.RATE_LIMIT_COMMENTS_PER_MINUTE || 10);
const PUBLIC_WRITE_LIMIT = Number(process.env.RATE_LIMIT_PUBLIC_WRITE_PER_MINUTE || 20);
const WINDOW_SECONDS = 60;

// Endpoints that must resist brute force and email bombing
const AUTH_PATHS = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
  "/api/v1/auth/verify-email",
  "/api/v1/auth/resend-verification-email",
];

// Public POST endpoints that trigger emails or store visitor submissions
const PUBLIC_WRITE_PATHS = ["/api/v1/received_emails", "/api/v1/subscribe"];

const COMMENT_PATH = /^\/api\/v1\/blog\/.+\/comments$/;

export default defineEventHandler(async (event) => {
  if (import.meta.prerender) return;

  const path = event.path.split("?")[0];
  if (!path.startsWith("/api/")) return;

  const isAuthPath = AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  const isCommentPost = COMMENT_PATH.test(path) && event.method === "POST";
  const isPublicWrite =
    event.method === "POST" &&
    PUBLIC_WRITE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  if (!isAuthPath && !isCommentPost && !isPublicWrite) return;

  const redis = event.context.redis as Redis | undefined;
  if (!redis) return;

  let limit: number;
  let bucket: string;
  let identity = getRequestIP(event, { xForwardedFor: true }) || "unknown";

  if (isAuthPath) {
    limit = AUTH_LIMIT;
    bucket = "auth";
  } else if (isCommentPost) {
    limit = COMMENT_LIMIT;
    bucket = "comments";
    // Prefer the authenticated identity so one user cannot rotate IPs to bypass
    const user = event.context.user as { userId?: string } | undefined;
    identity = user?.userId || identity;
  } else {
    limit = PUBLIC_WRITE_LIMIT;
    bucket = "public-write";
  }

  const key = `ratelimit:${bucket}:${identity}`;

  try {
    const results = await redis.multi().incr(key).expire(key, WINDOW_SECONDS).exec();
    const count = Number(results?.[0]?.[1] ?? 0);

    if (count > limit) {
      setResponseHeader(event, "Retry-After", String(WINDOW_SECONDS));
      throw createError({
        statusCode: 429,
        statusMessage: "Too Many Requests",
      });
    }
  } catch (e: any) {
    if (e?.statusCode === 429) throw e;
    console.warn("⚠️ Rate limiter unavailable (failing open):", e?.message || e);
  }
});
