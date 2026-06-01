import { prisma } from "@server/plugins/prisma";
import { syncUserToPrisma } from "@server/utils/prismaSync";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.number().optional(),
});

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  
  if (!prisma) {
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

  const slugParams = getRouterParam(event, 'slug');
  const slug = Array.isArray(slugParams) ? slugParams.join('/') : slugParams;

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

    // Sync user to Prisma
    const prismaUser = await syncUserToPrisma(user);
    if (!prismaUser) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to sync user",
      });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId: post.id,
        authorId: prismaUser.id,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: { name: true }
        }
      }
    });

    return {
      success: true,
      message: "Comment added successfully",
      data: comment,
    };
  } catch (e: any) {
    console.error("[blog API COMMENT POST] Error:", e.message);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
