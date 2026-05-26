// before
// import { PrismaClient } from '@prisma/client'
import { prisma } from "@server/plugins/prisma"; // path to your plugin file

export default defineEventHandler(async (event) => {
  // No need to create a new PrismaClient() anymore
  if (!prisma) {
    throw createError({
      statusCode: 500,
      statusMessage: "Database connection not initialized",
    });
  }

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "test@baderidris.com",
        name: "Test User",
      },
    });
  }

  const pseudoPost = await prisma.post.create({
    data: {
      title: "My First Pseudo Post",
      slug: `test-post-${Date.now()}`,
      content: "This is some dummy content for testing Prisma with Nuxt.",
      published: true,
      authorId: user.id,
    },
  });

  const allPosts = await prisma.post.findMany({
    include: { author: true },
  });

  return { createdPost: pseudoPost, allPosts };
});