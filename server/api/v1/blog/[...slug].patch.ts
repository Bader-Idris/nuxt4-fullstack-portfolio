import { getPrismaClient, prisma as importedPrisma } from "@server/plugins/prisma";
import { invalidateSitemapCache } from "@server/utils/sitemap";
import { decodeSlug, getSlugLookupVariants, slugify } from "@server/utils/slug";
import { z } from "zod";

const updatePostSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .refine((val) => /^[\p{L}\p{N}\p{M}\s_\-%+]+$/u.test(decodeSlug(val)), {
      message: "Slug must contain valid letters, numbers, hyphens, or underscores",
    })
    .optional(),
  content: z.string().min(10).optional(),
  published: z.boolean().optional(),
  status: z.enum(["published", "draft", "deleted"]).optional(),
  language: z.enum(["en", "es", "ar"]).optional(),
  summary: z.string().max(500).optional(),
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
      statusMessage: "Authentication required to modify blog posts",
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
  const decodedSlug = decodeSlug(rawSlug);

  const body = await readBody(event);
  const bodyValidation = updatePostSchema.safeParse(body);
  if (!bodyValidation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid update data: " + bodyValidation.error.issues[0].message,
    });
  }
  const updateData = bodyValidation.data;

  // Ensure slug is saved decoded and normalized if updated
  if (updateData.slug) {
    const rawDecoded = decodeSlug(updateData.slug);
    updateData.slug = slugify(rawDecoded) || rawDecoded;
  }

  // Keep published boolean and status field aligned
  if (updateData.published !== undefined && updateData.status === undefined) {
    updateData.status = updateData.published ? "published" : "draft";
  } else if (updateData.status !== undefined && updateData.published === undefined) {
    updateData.published = updateData.status === "published";
  }

  try {
    const post = await db.post.findFirst({
      where: {
        OR: slugVariants.map((slug) => ({ slug })),
      },
      include: { author: true },
    });

    if (!post) {
      throw createError({
        statusCode: 404,
        statusMessage: `Post not found: ${decodedSlug}`,
      });
    }

    const isAdmin = user.role === "admin";
    const isEditor = user.role === "editor";
    const isAuthor = post.author.mongodbId === user.userId;

    if (!isAdmin && !isEditor && !isAuthor) {
      throw createError({
        statusCode: 403,
        statusMessage: "You don't have permission to modify this post",
      });
    }

    const updatedPost = await db.post.update({
      where: { id: post.id },
      data: updateData,
    });

    // Invalidate sitemap cache on post edit
    await invalidateSitemapCache();

    return {
      success: true,
      message: "Post updated successfully",
      data: updatedPost,
    };
  } catch (e: any) {
    console.error(`[blog API PATCH] Error updating ${decodedSlug}:`, e.message);
    throw createError({
      statusCode: e.statusCode || 500,
      statusMessage: e.statusMessage || "Internal Server Error",
    });
  }
});
