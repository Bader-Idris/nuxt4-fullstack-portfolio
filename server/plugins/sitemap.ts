import { defineNitroPlugin } from "nitropack/runtime/plugin";
import { getPrismaClient } from "@server/plugins/prisma";

/**
 * Resolves `lastmod` for static sitemap pages using real DB timestamps.
 *
 * Blog post routes already carry DB-accurate `lastmod` from `/api/sitemap/blog`.
 * Static pages (/, /about, /projects, …) previously fell back to filesystem
 * mtime — which is meaningless after a git clone or deployment and changes
 * randomly with every build.
 *
 * Strategy:
 *   - Query the most recent `updatedAt` across `posts` and `contents` tables.
 *   - Use that value as the `lastmod` for every static page that lacks one.
 *
 * This is semantically correct: a static page's "last modification" is best
 * approximated by the last time any content on the site changed in the DB.
 */
export default defineNitroPlugin((nitroApp) => {
  // @ts-expect-error — nuxt-simple-sitemap hook
  nitroApp.hooks.hook("sitemap:resolved", async (ctx) => {
    // Fast-path: if every URL already has lastmod (e.g. all dynamic), skip DB hit.
    const needsLastmod = ctx.urls.some((u: any) => !u.lastmod);
    if (!needsLastmod) return;

    // Resolve Prisma — reuse the singleton created by the prisma plugin.
    const db = getPrismaClient();

    let fallbackLastmod: string | null = null;

    if (db) {
      try {
        const [latestPost, latestContent] = await Promise.all([
          db.post
            .findFirst({
              where: { published: true, status: { not: "deleted" } },
              orderBy: { updatedAt: "desc" },
              select: { updatedAt: true },
            })
            .catch(() => null),

          db.content
            .findFirst({
              orderBy: { updatedAt: "desc" },
              select: { updatedAt: true },
            })
            .catch(() => null),
        ]);

        const candidates: Date[] = [];
        if (latestPost?.updatedAt) candidates.push(new Date(latestPost.updatedAt));
        if (latestContent?.updatedAt) candidates.push(new Date(latestContent.updatedAt));

        if (candidates.length > 0) {
          const latest = new Date(Math.max(...candidates.map((d) => d.getTime())));
          fallbackLastmod = latest.toISOString();
        }
      } catch (e: any) {
        console.warn("⚠️ [sitemap] DB lastmod query failed:", e?.message || e);
      }
    }

    if (!fallbackLastmod) {
      // DB unavailable — skip rather than polluting the sitemap with today's date.
      console.warn("⚠️ [sitemap] No DB-backed lastmod available; leaving static-page lastmod unset.");
      return;
    }

    for (const url of ctx.urls) {
      // Blog routes already carry precise per-post timestamps from /api/sitemap/blog.
      if (url.lastmod) continue;
      url.lastmod = fallbackLastmod;
    }
  });
});