import { prisma } from "@server/plugins/prisma";
import { syncUserToPrisma } from "@server/utils/prismaSync";
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z.string().min(3).max(255).refine(val => /^[\p{L}0-9-]+$/u.test(val), {
    message: "Slug must be lowercase alphanumeric (including Unicode) with hyphens"
  }),
  content: z.string().optional(),
  published: z.boolean().default(false),
  language: z.enum(["en", "es", "ar"]).default("en"),
  summary: z.string().max(500).optional(),
});

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  
  if (!prisma) {
    throw createError({
      statusCode: 500,
      statusMessage: "Database connection not initialized",
    });
  }

  // Only Admin or Editor can create posts (or custom roles if defined)
  if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
    throw createError({
      statusCode: 403,
      statusMessage: "Insufficient permissions to create blog posts",
    });
  }

  const body = await readBody(event);
  const validation = createPostSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid post data: " + validation.error.issues[0].message,
    });
  }

  const postData = validation.data;

  try {
    // Ensure user exists in Prisma
    const prismaUser = await syncUserToPrisma(user);
    if (!prismaUser) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to sync user to PostgreSQL",
      });
    }

    const post = await prisma.post.create({
      data: {
        ...postData,
        authorId: prismaUser.id,
      },
    });

    return {
      success: true,
      message: "Post created successfully",
      data: post,
    };
  } catch (e: any) {
    if (e.code === 'P2002') {
      throw createError({
        statusCode: 400,
        statusMessage: "A post with this slug already exists",
      });
    }
    console.error("[blog API POST] Error creating post:", e.message);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
