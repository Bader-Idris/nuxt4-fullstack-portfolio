import { getPrismaClient, prisma as importedPrisma } from "@server/plugins/prisma";
import type { PrismaClient } from "@server/prisma/generated/prisma/client";

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

    // Dynamic blog post entries
    for (const post of posts) {
      if (!post.slug) continue;
      const lastmodDate = post.updatedAt || post.createdAt || new Date();
      routes.push(
        asSitemapUrl({
          loc: `/blog/${post.slug}`,
          lastmod: new Date(lastmodDate).toISOString(),
          _i18nTransform: true,
          changefreq: "weekly",
          priority: 0.8,
          _sitemap: "posts",
        })
      );
    }

    return routes;
  } catch (e: any) {
    console.error("[sitemap/blog] Database query failed:", e?.message || e);
    return [];
  }
});