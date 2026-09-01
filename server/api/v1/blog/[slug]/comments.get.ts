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
      select: { id: true },
    });

    if (!post) {
      throw createError({
        statusCode: 404,
        statusMessage: `Post not found: ${decodedSlug}`,
      });
    }

    // Fetch all comments flat
    const allComments = await db.comment.findMany({
      where: { postId: post.id },
      include: {
        author: {
          select: { name: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Build tree
    const commentMap = new Map();
    const tree: any[] = [];

    // Initialize map and replies array
    allComments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Populate tree
    allComments.forEach((comment) => {
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
    console.error(`[blog API COMMENT GET] Error fetching comments for ${decodedSlug}:`, e.message);
    throw createError({
      statusCode: e.statusCode || 500,
      statusMessage: e.statusMessage || "Internal Server Error",
    });
  }
});
