import { getPrismaClient, prisma as importedPrisma } from "@server/plugins/prisma";
import { syncUserToPrisma } from "@server/utils/prismaSync";
import { decodeSlug, getSlugLookupVariants } from "@server/utils/slug";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.union([z.number(), z.null()]).optional(),
});

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
      statusMessage: "Authentication required to post comments",
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

  const body = await readBody(event);
  const validation = commentSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid comment data: " + validation.error.issues[0].message,
    });
  }
  const { content, parentId } = validation.data;

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

    // Sync user to Prisma
    const prismaUser = await syncUserToPrisma(user);
    if (!prismaUser) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to sync user",
      });
    }

    const comment = await db.comment.create({
      data: {
        content,
        postId: post.id,
        authorId: prismaUser.id,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: { name: true },
        },
      },
    });

    return {
      success: true,
      message: "Comment added successfully",
      data: comment,
    };
  } catch (e: any) {
    console.error(`[blog API COMMENT POST] Error for ${decodedSlug}:`, e.message);
    throw createError({
      statusCode: e.statusCode || 500,
      statusMessage: e.statusMessage || "Internal Server Error",
    });
  }
});
