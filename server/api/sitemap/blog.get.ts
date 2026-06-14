import { prisma } from "@server/plugins/prisma";

export default defineEventHandler(async (event) => {
  if (!prisma) return [];
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
    return posts.map((post) => ({
      loc: `/blog/${post.slug}`,
      lastmod: post.updatedAt,
      _i18nTransform: true,   // ← expands to /en/blog/slug, /ar/blog/slug, etc.
    }));
  } catch (e) {
    console.error("Sitemap source error:", e);
    return [];
  }
});
