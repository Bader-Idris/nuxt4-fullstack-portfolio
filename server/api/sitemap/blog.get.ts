import { getPrismaClient, prisma as importedPrisma } from "@server/plugins/prisma";
import type { PrismaClient } from "@server/prisma/generated/prisma/client";
import { decodeSlug } from "@server/utils/slug";
import { extractImagesFromHtml } from "@server/utils/sitemap";

const RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 1000;

async function getPrismaWithRetry(event: any): Promise<PrismaClient | null> {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    const activePrisma =
      event?.context?.prisma ||
      getPrismaClient() ||
      importedPrisma ||
      (globalThis as any).prisma;

    if (activePrisma) return activePrisma;

    if (attempt < RETRY_ATTEMPTS) {
      console.warn(
        `[sitemap/blog] Prisma not ready, attempt ${attempt}/${RETRY_ATTEMPTS} — retrying in ${RETRY_DELAY_MS}ms`
      );
      await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
    }
  }
  return null;
}

export default defineEventHandler(async (event) => {
  // Set explicit no-cache headers so internal and external fetches always get fresh data
  setHeader(event, "Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  setHeader(event, "Pragma", "no-cache");
  setHeader(event, "Expires", "0");

  const db = await getPrismaWithRetry(event);

  if (!db) {
    console.error("[sitemap/blog] Prisma database unavailable after retries — serving empty sitemap");
    return [];
  }

  const query = getQuery(event);
  const page = Math.max(1, parseInt(String(query.page || "1"), 10));
  const hasExplicitLimit = typeof query.limit !== "undefined";
  const limit = Math.min(50000, Math.max(1, parseInt(String(query.limit || "50000"), 10)));
  const skip = (page - 1) * limit;

  try {
    const [latestPost, posts] = await Promise.all([
      db.post.findFirst({
        where: { published: true, status: { not: "deleted" } },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      db.post.findMany({
        where: { published: true, status: { not: "deleted" } },
        select: {
          slug: true,
          content: true,
          updatedAt: true,
          createdAt: true,
          title: true,
          summary: true,
          language: true,
        },
        orderBy: { updatedAt: "desc" },
        ...(hasExplicitLimit ? { take: limit, skip } : {}),
      }),
    ]);

    const routes: any[] = [];

    // Blog listing entry
    if (page === 1) {
      const blogLastmod = latestPost?.updatedAt
        ? new Date(latestPost.updatedAt).toISOString()
        : new Date().toISOString();

      routes.push(
        asSitemapUrl({
          loc: "/blog",
          lastmod: blogLastmod,
          _i18nTransform: true,
          changefreq: "daily",
          priority: 0.9,
          _sitemap: "posts",
        })
      );
    }

    // Dynamic blog post entries: route is localized according to post.language and appears ONLY ONCE
    for (const post of posts) {
      if (!post.slug) continue;
      const cleanSlug = decodeSlug(post.slug);
      if (!cleanSlug) continue;

      const lastmodDate = post.updatedAt || post.createdAt;
      const images = extractImagesFromHtml(post.content);

      // Determine language prefix (ar -> /ar/blog/..., es -> /es/blog/..., en/default -> /blog/...)
      const lang = post.language || "en";
      const prefix = lang === "ar" ? "/ar" : lang === "es" ? "/es" : "";
      const loc = `${prefix}/blog/${cleanSlug}`;

      routes.push(
        asSitemapUrl({
          loc,
          lastmod: lastmodDate ? new Date(lastmodDate).toISOString() : new Date().toISOString(),
          _i18nTransform: false,
          changefreq: "weekly",
          priority: 0.8,
          _sitemap: "posts",
          ...(images.length > 0 ? { images } : {}),
        })
      );
    }

    return routes;
  } catch (e: any) {
    console.error("[sitemap/blog] Database query failed:", e?.message || e);
    return [];
  }
});