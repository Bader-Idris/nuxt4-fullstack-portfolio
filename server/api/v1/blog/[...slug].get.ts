import { getPrismaClient, prisma as importedPrisma } from "@server/plugins/prisma";
import { decodeSlug, getSlugLookupVariants } from "@server/utils/slug";

export default defineEventHandler(async (event) => {
  const db = event?.context?.prisma || getPrismaClient() || importedPrisma || (globalThis as any).prisma;

  if (!db) {
    throw createError({
      statusCode: 500,
      statusMessage: "Database connection not initialized",
    });
  }

  const rawSlug = getRouterParam(event, "slug");
  if (!rawSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Slug is required",
    });
  }

  const slugVariants = getSlugLookupVariants(rawSlug);
  const decodedSlug = decodeSlug(rawSlug) || rawSlug;

  try {
    const post = await db.post.findFirst({
      where: {
        OR: slugVariants.map((slug) => ({ slug })),
      },
      include: {
        author: {
          select: {
            id: true,
            mongodbId: true,
            name: true,
            role: true,
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    if (!post) {
      throw createError({
        statusCode: 404,
        statusMessage: `Post not found: ${decodedSlug}`,
      });
    }

    const user = event.context.user;
    const isAdmin = user?.role === "admin";
    const isEditor = user?.role === "editor";
    const isAuthor = Boolean(user && post.author?.mongodbId === user.userId);

    // Hide deleted posts from regular clients and search engines
    if (post.status === "deleted" && !isAdmin && !isEditor) {
      throw createError({
        statusCode: 404,
        statusMessage: `Post not found: ${decodedSlug}`,
      });
    }

    // Auth check for unpublished posts
    if (!post.published && !isAdmin && !isEditor && !isAuthor) {
      throw createError({
        statusCode: 403,
        statusMessage: "You are not authorized to view this unpublished post",
      });
    }

    // Tracking views — throttled per IP (1 view per post per hour) so view
    // counts can't be trivially inflated by replaying requests
    if (post.published) {
      const redis = event.context.redis;
      let shouldCount = true;
      if (redis) {
        try {
          const ip = getRequestIP(event, { xForwardedFor: true }) || "unknown";
          const viewKey = `blog:view:${post.id}:${ip}`;
          shouldCount = (await redis.set(viewKey, "1", "EX", 3600, "NX")) === "OK";
        } catch {
          // Redis unavailable: keep counting rather than lose view data
        }
      }
      if (shouldCount) {
        db.post
          .update({
            where: { id: post.id },
            data: { viewCount: { increment: 1 } },
          })
          .catch((err: any) => console.error("[blog API] Failed to increment view count:", err));
      }
    }

    return {
      success: true,
      data: {
        ...post,
        author: {
          ...post.author,
          name: post.author?.name || "Bader Idris",
        },
        commentCount: post._count?.comments || 0,
        isAuthor: isAuthor || false,
      },
    };
  } catch (e: any) {
    console.error(`[blog API GET] Error fetching ${decodedSlug}:`, e.message);
    throw createError({
      statusCode: e.statusCode || 500,
      statusMessage: e.statusMessage || "Internal Server Error",
    });
  }
});
