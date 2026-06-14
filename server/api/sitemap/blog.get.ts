import { prisma } from "@server/plugins/prisma";

const RETRY_ATTEMPTS = 6;
const RETRY_DELAY_MS = 1500; // 6 × 1.5s = up to 9s total — enough for psql cold start

async function getPrismaWithRetry() {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    if (prisma) return prisma;
    console.warn(`[sitemap/blog] Prisma not ready, attempt ${attempt}/${RETRY_ATTEMPTS} — retrying in ${RETRY_DELAY_MS}ms`);
    await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
  }
  return null;
}

export default defineEventHandler(async (event) => {
  const db = await getPrismaWithRetry();

  if (!db) {
    console.error("[sitemap/blog] Prisma unavailable after all retries — serving empty sitemap");
    return [];
  }

  try {
    const [latestPost, posts] = await Promise.all([
      db.post.findFirst({
        where: { published: true },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      db.post.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const routes: { loc: string; lastmod: Date; _i18nTransform: boolean }[] = [
      {
        loc: "/blog",
        lastmod: latestPost?.updatedAt ?? new Date(),
        _i18nTransform: true,
      },
    ];

    for (const post of posts) {
      routes.push({
        loc: `/blog/${post.slug}`,
        lastmod: post.updatedAt,
        _i18nTransform: true,
      });
    }

    return routes;
  } catch (e) {
    console.error("[sitemap/blog] Query failed:", e);
    return [];
  }
});