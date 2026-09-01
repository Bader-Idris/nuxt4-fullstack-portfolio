import { getPrismaClient, prisma as importedPrisma } from "@server/plugins/prisma";
import { invalidateSitemapCache } from "@server/utils/sitemap";

export default defineEventHandler(async (event) => {
  const db = event?.context?.prisma || getPrismaClient() || importedPrisma || (globalThis as any).prisma;

  if (!db) {
    throw createError({ statusCode: 500, statusMessage: "Database connection not initialized" });
  }

  // Check if posts exist
  const count = await db.post.count();
  if (count > 0) {
    return { success: false, message: "Database already populated" };
  }

  // Create author if not exists
  let author = await db.user.findFirst();
  if (!author) {
    author = await db.user.create({
      data: {
        mongodbId: "placeholder-id",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
      },
    });
  }

  // Seed 3 posts
  const posts = [
    { title: "Test Post 1", slug: "test-post-1", summary: "Summary 1", content: "Content 1", language: "en", published: true, status: "published", authorId: author.id },
    { title: "Test Post 2", slug: "test-post-2", summary: "Summary 2", content: "Content 2", language: "en", published: true, status: "published", authorId: author.id },
    { title: "Test Post 3", slug: "test-post-3", summary: "Summary 3", content: "Content 3", language: "en", published: true, status: "published", authorId: author.id },
  ];

  for (const p of posts) {
    await db.post.create({ data: p });
  }

  await invalidateSitemapCache();

  return { success: true, message: "Database seeded with 3 posts" };
});

