import { getPrismaClient, prisma as importedPrisma } from "@server/plugins/prisma";
import { invalidateSitemapCache } from "@server/utils/sitemap";

export default defineEventHandler(async (event) => {
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

  const allPosts = await db.post.findMany({
    include: { author: true },
    orderBy: { createdAt: "desc" },
  });

  return { createdPost: pseudoPost, allPosts };
});