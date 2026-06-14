import { defineNitroPlugin } from "nitropack/runtime/plugin";
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
      // not found, try next
    }
  }

  return null; // dynamic route or missing file — caller decides fallback
}

export default defineNitroPlugin((nitroApp) => {
  // @ts-expect-error — nuxt-simple-sitemap hook
  nitroApp.hooks.hook("sitemap:resolved", async (ctx) => {
    for (const url of ctx.urls) {
      // Skip if lastmod already set by an API source (blog posts, etc.)
      if (url.lastmod && !url._generated) continue;

      try {
        // URL has to be dynamic with runtimeConfig
        const urlObj = new URL(url.loc, "https://baderidris.com");
        let relativePath = urlObj.pathname.replace(/\/$/, "") || "/";

        // Strip locale prefix: /ar/about → /about
        relativePath = relativePath.replace(LOCALE_PATTERN, "/").replace(/\/+/g, "/") || "/";

        const lastmod = getLastmodFromFile(relativePath);

        if (lastmod) {
          url.lastmod = lastmod;
        } else if (!url.lastmod) {
          // Dynamic routes or files not found: fall back to build time
          url.lastmod = new Date().toISOString();
        }
      } catch {
        // Malformed URL — leave lastmod as-is
      }
    }
  });
});