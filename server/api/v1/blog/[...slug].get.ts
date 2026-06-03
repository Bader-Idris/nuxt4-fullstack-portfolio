import { prisma } from "@server/plugins/prisma";
import { z } from "zod";

const slugSchema = z.string().min(1).max(255).refine(val => /^[\p{L}0-9-\/]+$/u.test(val), { message: "Invalid slug format" });

export default defineEventHandler(async (event) => {
  const slugParams = getRouterParam(event, 'slug');
  const rawSlug = Array.isArray(slugParams) ? slugParams.join('/') : slugParams;
  
  if (!prisma) {
    throw createError({
      statusCode: 500,
      statusMessage: "Database connection not initialized",
    });
  }

  // Validate slug
  const validation = slugSchema.safeParse(rawSlug);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: validation.error.issues[0].message,
    });
  }
  const slug = validation.data;

  try {
    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            mongodbId: true,
            name: true,
            role: true,
          }
        },
        _count: {
          select: { comments: true }
        }
      }
    });

    if (!post) {
      throw createError({
        statusCode: 404,
        statusMessage: `Post not found: ${slug}`,
      });
    }

    const user = event.context.user;
    const isAdmin = user?.role === 'admin';
    const isEditor = user?.role === 'editor';
    const isAuthor = user && post.author.mongodbId === user.userId;
    
    // Auth check for unpublished posts
    if (!post.published && !isAdmin && !isEditor && !isAuthor) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You are not authorized to view this unpublished post',
      });
    }

    // Tracking views
    if (post.published) {
      prisma.post.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } }
      }).catch(err => console.error('[blog API] Failed to increment view count:', err));
    }

    return {
      success: true,
      data: {
        ...post,
        commentCount: post._count.comments,
        isAuthor: isAuthor || false,
      }
    };
  } catch (e: any) {
    console.error(`[blog API GET] Error fetching ${slug}:`, e.message);
    throw createError({
      statusCode: e.statusCode || 500,
      statusMessage: e.statusMessage || 'Internal Server Error',
    });
  }
});
