/**
 * Universal Slug Utilities (Client & SSR)
 *
 * Fully decodes slug strings even if they are single-, double-, or multi-encoded.
 * Handles non-English Unicode scripts (Arabic, Spanish, CJK, Cyrillic, Hebrew, etc.),
 * combining diacritics/tashkeel, and space-enriched text (spaces, %20, +, underscores, hyphens).
 */

/**
 * Fully decodes a slug string even if it was single-, double-, or multi-encoded.
 * Normalizes Unicode to NFC and cleans leading/trailing whitespace and slashes.
 */
export function decodeSlug(input: string | string[] | undefined | null): string {
  if (!input) return "";

  let s = Array.isArray(input) ? input.filter(Boolean).join("/") : String(input);
  s = s.trim();

  // Strip leading and trailing slashes if present
  s = s.replace(/^\/+|\/+$/g, "");

  // Multi-level URI decoding to handle double or triple percent-encoded URLs
  for (let i = 0; i < 4; i++) {
    try {
      const decoded = decodeURIComponent(s);
      if (decoded === s) break;
      s = decoded;
    } catch {
      // If decodeURIComponent fails due to malformed sequences, try decodeURI fallback
      try {
        const decodedUri = decodeURI(s);
        if (decodedUri === s) break;
        s = decodedUri;
      } catch {
        break;
      }
    }
  }

  // Normalize Unicode to canonical composition (NFC)
  try {
    s = s.normalize("NFC");
  } catch {}

  return s.trim();
}

/**
 * Returns safe encoded slug for network requests and URL formatting.
 */
export function encodeSlug(input: string | string[] | undefined | null): string {
  const clean = decodeSlug(input);
  return encodeURIComponent(clean);
}

/**
 * Generates an SEO-friendly slug from a title string while preserving
 * full Unicode support for non-English alphabets (Arabic, Spanish, CJK, etc.),
 * numbers (\p{N}), combining marks (\p{M}), and converting spaces/punctuations into hyphens.
 */
export function slugify(input: string | undefined | null): string {
  if (!input) return "";

  const decoded = decodeSlug(input);
  return decoded
    .toLowerCase()
    .normalize("NFC")
    // Keep Unicode letters, numbers, marks, spaces, hyphens, underscores
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "")
    .trim()
    .replace(/[\s_+]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
