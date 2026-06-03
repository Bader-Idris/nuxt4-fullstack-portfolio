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

    // Fetch all comments flat
    const allComments = await prisma.comment.findMany({
      where: { postId: post.id },
      include: {
        author: {
          select: { name: true, role: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Build tree
    const commentMap = new Map();
    const tree: any[] = [];

    // Initialize map and replies array
    allComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Populate tree
    allComments.forEach(comment => {
      const node = commentMap.get(comment.id);
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(node);
        } else {
          // Parent not found, treat as top level
          tree.push(node);
        }
      } else {
        tree.push(node);
      }
    });

    return {
      success: true,
      data: tree,
    };
  } catch (e: any) {
    console.error("[blog API COMMENT GET] Error fetching comments:", e.message);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
