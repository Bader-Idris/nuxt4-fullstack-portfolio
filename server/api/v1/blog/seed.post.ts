import { prisma } from "@server/plugins/prisma";

export default defineEventHandler(async (event) => {
  if (!prisma) {
    throw createError({ statusCode: 500, statusMessage: "Database connection not initialized" });
  }

  // Check if posts exist
  const count = await prisma.post.count();
  if (count > 0) {
    return { success: false, message: "Database already populated" };
  }

  // Create author if not exists
  let author = await prisma.user.findFirst();
  if (!author) {
    author = await prisma.user.create({
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
    { title: "Test Post 1", slug: "test-post-1", summary: "Summary 1", content: "Content 1", language: "en", published: true, authorId: author.id },
    { title: "Test Post 2", slug: "test-post-2", summary: "Summary 2", content: "Content 2", language: "en", published: true, authorId: author.id },
    { title: "Test Post 3", slug: "test-post-3", summary: "Summary 3", content: "Content 3", language: "en", published: true, authorId: author.id },
  ];

  for (const p of posts) {
    await prisma.post.create({ data: p });
  }

  return { success: true, message: "Database seeded with 3 posts" };
});
