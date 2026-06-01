import { prisma } from "@server/plugins/prisma";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const lang = query.lang as string;
  const publishedOnly = query.publishedOnly !== 'false';
  
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

    return {
      success: true,
      data: posts.map(post => ({
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
      })),
    };
  } catch (e: any) {
    console.error("[blog API GET ALL] Error fetching posts:", e.message);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
