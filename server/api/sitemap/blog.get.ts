import { prisma as importedPrisma } from "@server/plugins/prisma";
import type { PrismaClient } from "@server/prisma/generated/prisma/client";

const RETRY_ATTEMPTS = 6;
const RETRY_DELAY_MS = 1500; // 6 × 1.5s = up to 9s total — enough for psql cold start

async function getPrismaWithRetry(event: any): Promise<PrismaClient | null> {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    const activePrisma = importedPrisma || event.context.prisma || (globalThis as any).prisma;
    if (activePrisma) return activePrisma;
    console.warn(`[sitemap/blog] Prisma not ready, attempt ${attempt}/${RETRY_ATTEMPTS} — retrying in ${RETRY_DELAY_MS}ms`);
    await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
  }
  return importedPrisma || event.context.prisma || (globalThis as any).prisma || null;
}

export default defineEventHandler(async (event) => {
  const db = await getPrismaWithRetry(event);

  if (!db) {
    console.error("[sitemap/blog] Prisma unavailable after all retries — serving empty sitemap");
    return [];
  }

  const query = getQuery(event);
  const page = Math.max(1, parseInt(String(query.page || '1'), 10));
  const limit = Math.min(1000, Math.max(1, parseInt(String(query.limit || '1000'), 10)));
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
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: skip,
      }),
    ]);

    const routes: { loc: string; lastmod: Date; _i18nTransform: boolean }[] = [];

    if (page === 1) {
      routes.push({
        loc: "/blog",
        lastmod: latestPost?.updatedAt ?? new Date(),
        _i18nTransform: true,
      });
    }

    for (const post of posts) {
      routes.push({
        loc: `/blog/${post.slug}`,
        lastmod: post.updatedAt,
        _i18nTransform: true,
      });
    }

    return routes;
  } catch (e: any) {
    console.error("[sitemap/blog] Database query failed:", e?.message || e);
    return [];
  }
});