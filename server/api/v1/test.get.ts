import { getPrismaClient, prisma as importedPrisma } from "@server/plugins/prisma";
import { invalidateBlogListCache } from "@server/utils/cacheInvalidation";
import { invalidateSitemapCache } from "@server/utils/sitemap";

export default defineEventHandler(async (event) => {
  // This endpoint creates junk data and dumps every post (authors included):
  // never expose it in production unless explicitly enabled, and admin-only then.
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && process.env.ENABLE_TEST_ENDPOINT !== "true") {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const authUser = event.context.user;
  if (isProduction && (!authUser || authUser.role !== "admin")) {
    throw createError({
      statusCode: 403,
      statusMessage: "Admin access required",
    });
  }

  const db = event.context?.prisma || getPrismaClient() || importedPrisma || (globalThis as any).prisma;

  if (!db) {
    throw createError({
      statusCode: 500,
      statusMessage: "Database connection not initialized",
    });
  }

  let user = await db.user.findFirst();
  if (!user) {
    user = await db.user.create({
      data: {
        mongodbId: `test-user-${Date.now()}`,
        email: "test@baderidris.com",
        name: "Test User",
      },
    });
  }

  const timestamp = Date.now();
  const pseudoPost = await db.post.create({
    data: {
      title: `My Test Post ${timestamp}`,
      slug: `test-post-${timestamp}`,
      content: "This is some dummy content for testing Prisma with Nuxt.",
      published: true,
      status: "published",
      language: "en",
      summary: "This is a summary for the test post.",
      authorId: user.id,
    },
  });

  // Invalidate sitemap cache immediately so newly created post appears in sitemaps
  await invalidateSitemapCache();
  await invalidateBlogListCache(event.context.redis);

  const allPosts = await db.post.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      status: true,
      createdAt: true,
      author: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { createdPost: pseudoPost, allPosts };
});