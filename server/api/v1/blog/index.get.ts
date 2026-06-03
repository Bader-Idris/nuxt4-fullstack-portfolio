import { prisma } from "@server/plugins/prisma";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const lang = query.lang as string;
  const publishedOnly = query.publishedOnly !== 'false';
  const redis = event.context.redis;
  
  if (!prisma) {
    throw createError({
      statusCode: 500,
      statusMessage: "Database connection not initialized",
    });
  }

  const user = event.context.user;
  const isAdmin = user?.role === 'admin';
  const isEditor = user?.role === 'editor';
  
  // Professionals: if not admin/editor, always show only published
  const showOnlyPublished = !isAdmin && !isEditor ? true : publishedOnly;

  // Cache key based on query params and user permissions
  const cacheKey = `blog:list:${lang || 'all'}:${showOnlyPublished}:${isAdmin || isEditor}`;

  // Try to get from Redis if available
  if (redis) {
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        // console.log(`🚀 [blog API GET ALL] Serving from cache: ${cacheKey}`);
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
    const posts = await prisma.post.findMany({
      where: {
        ...(lang && { language: lang }),
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
      slug: post.slug,
      summary: post.summary,
      published: post.published,
      language: post.language,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      commentCount: post._count.comments,
      author: post.author.name,
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
    console.error("[blog API GET ALL] Error fetching posts:", e.message);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
