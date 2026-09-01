import { getPrismaClient, prisma as importedPrisma } from "@server/plugins/prisma";
import { syncUserToPrisma } from "@server/utils/prismaSync";
import { invalidateSitemapCache } from "@server/utils/sitemap";
import { decodeSlug, slugify } from "@server/utils/slug";
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .refine((val) => /^[\p{L}\p{N}\p{M}\s_\-%+]+$/u.test(decodeSlug(val)), {
      message: "Slug must contain valid letters, numbers, hyphens, or underscores",
    }),
  content: z.string().optional(),
  published: z.boolean().default(false),
  language: z.enum(["en", "es", "ar"]).default("en"),
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

  // Only Admin or Editor can create posts
  if (!user || (user.role !== "admin" && user.role !== "editor")) {
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
  // Always normalize slug to clean decoded UTF-8 slug format
  const rawDecoded = decodeSlug(postData.slug);
  postData.slug = slugify(rawDecoded) || rawDecoded;

  try {
    // Ensure user exists in Prisma
    const prismaUser = await syncUserToPrisma(user);
    if (!prismaUser) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to sync user to PostgreSQL",
      });
    }

    const post = await db.post.create({
      data: {
        ...postData,
        authorId: prismaUser.id,
      },
    });

    // Invalidate Redis cache for blog lists
    const redis = event.context.redis;
    if (redis) {
      try {
        const keys = await redis.keys("blog:list:*");
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (e) {
        console.warn("⚠️ Failed to invalidate Redis cache:", e);
      }
    }

    // Invalidate sitemap cache so new post immediately shows in sitemaps
    await invalidateSitemapCache();

    return {
      success: true,
      message: "Post created successfully",
      data: post,
    };
  } catch (e: any) {
    if (e.code === "P2002") {
      throw createError({
        statusCode: 400,
        statusMessage: "A post with this slug already exists",
      });
    }
    console.error("[blog API POST] Error creating post:", e);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error: " + (e.message || "Unknown error"),
    });
  }
});
