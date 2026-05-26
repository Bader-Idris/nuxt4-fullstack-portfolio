import { prisma } from "@server/plugins/prisma";
import { z } from "zod";

const slugSchema = z.string().min(1).max(255).regex(/^[a-z0-9-/]+$/, "Invalid slug format");
const updatePostSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  content: z.string().min(10).optional(),
  published: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  
  if (!prisma) {
    throw createError({
      statusCode: 500,
      statusMessage: "Database connection not initialized",
    });
  }

  // Only authenticated users can modify posts
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required to modify blog posts",
    });
  }

  const slugParams = getRouterParam(event, 'slug');
  const rawSlug = Array.isArray(slugParams) ? slugParams.join('/') : slugParams;
  
  // Validate slug
  const slugValidation = slugSchema.safeParse(rawSlug);
  if (!slugValidation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid slug: " + slugValidation.error.issues[0].message,
    });
  }
  const slug = slugValidation.data;

  // Validate body
  const body = await readBody(event);
  const bodyValidation = updatePostSchema.safeParse(body);
  if (!bodyValidation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid update data: " + bodyValidation.error.issues[0].message,
    });
  }
  const updateData = bodyValidation.data;

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

    // Authorization check: Only Admin, Editor, or the original Author can modify
    const isAdmin = user.role === 'admin';
    const isEditor = user.role === 'editor';
    const isAuthor = post.authorId === Number(user.userId);

    if (!isAdmin && !isEditor && !isAuthor) {
      throw createError({
        statusCode: 403,
        statusMessage: "You don't have permission to modify this post",
      });
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: updateData,
    });

    return {
      success: true,
      message: "Post updated successfully",
      data: updatedPost,
    };
  } catch (e: any) {
    console.error(`[blog API PATCH] Error updating ${slug}:`, e.message);
    throw createError({
      statusCode: e.statusCode || 500,
      statusMessage: e.statusMessage || 'Internal Server Error',
    });
  }
});
