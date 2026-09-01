import { getPrismaClient, prisma as importedPrisma } from "@server/plugins/prisma";
import { invalidateSitemapCache } from "@server/utils/sitemap";
import { decodeSlug, getSlugLookupVariants } from "@server/utils/slug";

export default defineEventHandler(async (event) => {
  const db = event?.context?.prisma || getPrismaClient() || importedPrisma || (globalThis as any).prisma;
  const user = event.context.user;
  
  if (!db) {
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

  const rawSlug = getRouterParam(event, 'slug');
  
  if (!rawSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Slug is required",
    });
  }

  const slugVariants = getSlugLookupVariants(rawSlug);
  const decodedSlug = decodeSlug(rawSlug);

  try {
    const post = await db.post.findFirst({
      where: {
        OR: slugVariants.map(slug => ({ slug })),
      },
      include: { author: true }
    });

    if (!post) {
      throw createError({
        statusCode: 404,
        statusMessage: `Post not found: ${decodedSlug}`,
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

    await db.post.update({
      where: { id: post.id },
      data: { status: 'deleted' },
    });

    // Invalidate sitemap cache on post deletion so it disappears immediately from sitemaps
    await invalidateSitemapCache();

    return {
      success: true,
      message: "Post deleted successfully",
    };
  } catch (e: any) {
    console.error(`[blog API DELETE] Error deleting ${decodedSlug}:`, e.message);
    throw createError({
      statusCode: e.statusCode || 500,
      statusMessage: e.statusMessage || 'Internal Server Error',
    });
  }
});
