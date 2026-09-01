/**
 * Extracts image URLs from post HTML content for rich Google Image search indexing in sitemaps
 */
export function extractImagesFromHtml(html?: string | null): { loc: string }[] {
  if (!html) return [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const images: { loc: string }[] = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    if (src && !src.startsWith("data:") && !images.some((img) => img.loc === src)) {
      images.push({ loc: src });
    }
  }
  return images.slice(0, 10);
}

export async function invalidateSitemapCache(): Promise<void> {
  try {
    const storage = (globalThis as any).useStorage ? (globalThis as any).useStorage() : null;
    if (!storage) return;

    // Clear all keys under cache:sitemap and cache:nitro:*sitemap*
    const prefixes = [
      "cache:sitemap",
      "sitemap",
      "cache:nitro:functions:sitemap",
      "cache:nitro:handlers:sitemap",
    ];
    for (const prefix of prefixes) {
      try {
        const keys = await storage.getKeys(prefix).catch(() => []);
        for (const key of keys) {
          await storage.removeItem(key).catch(() => {});
        }
      } catch {
        // Continue cleaning other prefixes
      }
    }

    // Also scan all cache keys for any sitemap related entries
    try {
      const allCacheKeys = await storage.getKeys("cache").catch(() => []);
      for (const key of allCacheKeys) {
        if (key.toLowerCase().includes("sitemap")) {
          await storage.removeItem(key).catch(() => {});
        }
      }
    } catch {
      // Fallback ignore
    }
  } catch (e: any) {
    console.warn("⚠️ [sitemap] Error invalidating sitemap storage cache:", e?.message || e);
  }
}
