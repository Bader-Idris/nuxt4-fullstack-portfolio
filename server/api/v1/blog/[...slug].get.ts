import { prisma } from "@server/plugins/prisma";
import { z } from "zod";

const slugSchema = z.string().min(1).max(255).regex(/^[a-z0-9-/]+$/, "Invalid slug format");

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
            name: true,
            email: true,
            role: true,
          }
        }
      }
    });

    if (!post) {
      throw createError({
        statusCode: 404,
        statusMessage: `Post not found: ${slug}`,
      });
    }

    // Authorization check
    const user = event.context.user; // Populated by auth middleware
    const isAdmin = user?.role === 'admin';
    const isEditor = user?.role === 'editor';
    const isAuthor = user && post.authorId === Number(user.userId);
    
    // Professionals: admin, editor, or author can see unpublished
    const isAuthorized = isAdmin || isEditor || isAuthor;

    if (!post.published && !isAuthorized) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You are not authorized to view this unpublished post',
      });
    }

    // Professional touch: track views asynchronously
    if (post.published) {
      prisma.post.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } }
      }).catch(err => console.error('[blog API] Failed to increment view count:', err));
    }

    return {
      success: true,
      data: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        content: post.content,
        published: post.published,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        viewCount: post.viewCount,
        metadata: {
          author: post.author.name || post.author.email,
          role: post.author.role,
          isAuthor: isAuthor || false,
        },
        author: {
          id: post.author.id,
          name: post.author.name,
          role: post.author.role,
        }
      }
    };
  } catch (e: any) {
    console.error(`[blog API] Error fetching ${slug}:`, e.message);
    throw createError({
      statusCode: e.statusCode || 500,
      statusMessage: e.statusMessage || 'Internal Server Error',
    });
  }
});
