import { getPrismaClient, prisma as importedPrisma } from "@server/plugins/prisma";
import { decodeSlug } from "@server/utils/slug";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const langQuery = query.lang as string;
  const langs = langQuery ? langQuery.split(',').filter(Boolean) : [];
  const publishedOnly = query.publishedOnly !== 'false';
  const redis = event.context.redis;
  
  const db = event?.context?.prisma || getPrismaClient() || importedPrisma || (globalThis as any).prisma;

  if (!db) {
    throw createError({
      statusCode: 500,
      statusMessage: "Database connection not initialized",
    });
  }

  const user = event.context.user;
  const isAdmin = user?.role === 'admin';
  const isEditor = user?.role === 'editor';
  
  // If not admin/editor, always show only published
  const showOnlyPublished = !isAdmin && !isEditor ? true : publishedOnly;

  // Cache key based on query params and user permissions
  const cacheKey = `blog:list:${langs.join(',') || 'all'}:${showOnlyPublished}:${isAdmin || isEditor}`;

  // Try to get from Redis if available
  if (redis) {
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return {
          success: true,
          data: JSON.parse(cachedData),
          _fromCache: true
        };
      }
    } catch (e) {
      console.warn("⚠️ Redis cache read error:", e);
    }
  }

  try {
    const posts = await db.post.findMany({
      where: {
        status: { not: 'deleted' },
        ...(langs.length > 0 && { language: { in: langs } }),
        ...(showOnlyPublished && { published: true }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: {
            name: true,
            role: true,
          }
        },
        _count: {
          select: { comments: true }
        }
      }
    });

    const responseData = posts.map(post => ({
      id: post.id,
      title: post.title,
      slug: decodeSlug(post.slug),
      summary: post.summary || "",
      published: post.published,
      language: post.language,
      viewCount: post.viewCount || 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      commentCount: post._count?.comments || 0,
      author: post.author?.name || "Bader Idris",
    }));

    // Save to Redis if available (cache for 5 minutes)
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(responseData), 'EX', 300);
      } catch (e) {
        console.warn("⚠️ Redis cache write error:", e);
      }
    }

    return {
      success: true,
      data: responseData,
    };
  } catch (e: any) {
    console.error("[blog API GET ALL] Error fetching posts:", e?.message || e);
    throw createError({
      statusCode: e.statusCode || 500,
      statusMessage: e.statusMessage || e.message || "Internal Server Error",
    });
  }
});
