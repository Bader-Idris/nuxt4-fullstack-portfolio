import { prisma } from "@server/plugins/prisma";

export default defineEventHandler(async (event) => {
  if (!prisma) {
    throw createError({
      statusCode: 500,
      statusMessage: "Database connection not initialized",
    });
  }

  const slugParams = getRouterParam(event, 'slug');
  const slug = Array.isArray(slugParams) ? slugParams.join('/') : slugParams;

  try {
    const post = await prisma.post.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!post) {
      throw createError({
        statusCode: 404,
        statusMessage: "Post not found",
      });
    }

    const comments = await prisma.comment.findMany({
      where: { 
        postId: post.id,
        parentId: null // Get top-level comments first
      },
      include: {
        author: {
          select: { name: true, role: true }
        },
        replies: {
          include: {
            author: {
              select: { name: true, role: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      data: comments,
    };
  } catch (e: any) {
    console.error("[blog API COMMENT GET] Error:", e.message);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
