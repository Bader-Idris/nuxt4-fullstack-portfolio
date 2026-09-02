import { defineNitroPlugin } from "nitropack/runtime/plugin";
import { decodeSlug } from "@server/utils/slug";
import fs from "node:fs";
import path from "node:path";

const SUPPORTED_LOCALES = ["ar", "es", "en"] as const;
const LOCALE_PATTERN = new RegExp(`^/(${SUPPORTED_LOCALES.join("|")})(\/|$)`);

function getLastmodFromFile(relativePath: string): string | null {
  const pagesDir = path.resolve(process.cwd(), "app/pages");

  const normalised = relativePath === "/" ? "/index" : relativePath;

  const candidates = [
    path.join(pagesDir, `${normalised}.vue`),
    path.join(pagesDir, normalised, "index.vue"),
  ];

  for (const candidate of candidates) {
    try {
      const stats = fs.statSync(candidate);
      return stats.mtime.toISOString();
    } catch {
      // not found, try next candidate
    }
  }

  return null; // dynamic route or missing file — caller decides fallback
}

export default defineNitroPlugin((nitroApp) => {
  // @ts-expect-error — nuxt-simple-sitemap hook
  nitroApp.hooks.hook("sitemap:resolved", async (ctx) => {
    for (const url of ctx.urls) {
      // Skip if lastmod is already set (e.g. from /api/sitemap/blog or DB)
      if (url.lastmod) continue;

      try {
        const urlObj = new URL(url.loc, "https://baderidris.com");
        let relativePath = urlObj.pathname.replace(/\/$/, "") || "/";

        // Strip locale prefix: /ar/about → /about, /es/blog → /blog
        relativePath = relativePath.replace(LOCALE_PATTERN, "/").replace(/\/+/g, "/") || "/";

        // Fully decode URL components for file system lookup
        const decodedRelativePath = decodeSlug(relativePath) || relativePath;

        const lastmod = getLastmodFromFile(decodedRelativePath);

        if (lastmod) {
          url.lastmod = lastmod;
        }
      } catch {
        // Malformed URL — leave lastmod as-is
      }
    }
  });
});