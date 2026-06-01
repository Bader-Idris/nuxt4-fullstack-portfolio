import { prisma } from "@server/plugins/prisma";
import { z } from "zod";

const slugSchema = z.string().min(1).max(255).regex(/^[a-z0-9-/]+$/, "Invalid slug format");

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  
  if (!prisma) {
    throw createError({
      statusCode: 500,
      statusMessage: "Database connection not initialized",
    });
  }

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required to delete blog posts",
    });
  }

  const slugParams = getRouterParam(event, 'slug');
  const rawSlug = Array.isArray(slugParams) ? slugParams.join('/') : slugParams;
  
  const slugValidation = slugSchema.safeParse(rawSlug);
  if (!slugValidation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid slug format",
    });
  }
  const slug = slugValidation.data;

  try {
    const post = await prisma.post.findUnique({
      where: { slug },
      include: { author: true }
    });

    if (!post) {
      throw createError({
        statusCode: 404,
        statusMessage: `Post not found: ${slug}`,
      });
    }

    const isAdmin = user.role === 'admin';
    const isEditor = user.role === 'editor';
    const isAuthor = post.author.mongodbId === user.userId;

    if (!isAdmin && !isEditor && !isAuthor) {
      throw createError({
        statusCode: 403,
        statusMessage: "You don't have permission to delete this post",
      });
    }

    await prisma.post.delete({
      where: { id: post.id },
    });

    return {
      success: true,
      message: "Post deleted successfully",
    };
  } catch (e: any) {
    console.error(`[blog API DELETE] Error deleting ${slug}:`, e.message);
    throw createError({
      statusCode: e.statusCode || 500,
      statusMessage: e.statusMessage || 'Internal Server Error',
    });
  }
});
