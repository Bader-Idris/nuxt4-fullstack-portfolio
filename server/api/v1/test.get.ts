import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // For testing: Create a dummy user if none exists (or use an existing one)
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'test@baderidris.com',
        name: 'Test User',
      },
    });
  }

  // Create a pseudo (dummy) post associated with the user
  const pseudoPost = await prisma.post.create({
    data: {
      title: 'My First Pseudo Post',
      content: 'This is some dummy content for testing Prisma with Nuxt.',
      published: true,
      authorId: user.id,
    },
  });

  // Optionally, fetch all posts to verify
  const allPosts = await prisma.post.findMany({
    include: { author: true }, // Include author details if needed
  });

  return { createdPost: pseudoPost, allPosts };
})