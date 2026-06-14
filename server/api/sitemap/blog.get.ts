import { prisma } from "@server/plugins/prisma";

export default defineEventHandler(async (event) => {
  if (!prisma) return [];
  try {
    // 1. Include the blog index itself
    // We get the latest post date to use as lastmod for the index if possible
    const latestPost = await prisma.post.findFirst({
      where: { published: true },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true }
    });

    const routes: any[] = [
      {
        loc: '/blog',
        lastmod: latestPost?.updatedAt || new Date(),
        _i18nTransform: true
      }
    ];

    // 2. Include all published posts
    const posts = await prisma.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });

    posts.forEach((post) => {
      routes.push({
        loc: `/blog/${post.slug}`,
        lastmod: post.updatedAt,
        _i18nTransform: true,
      });
    });

    return routes;
  } catch (e) {
    console.error("Sitemap source error:", e);
    return [];
  }
});
