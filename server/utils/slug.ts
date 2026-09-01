/**
 * Universal Slug Utilities (Server & Shared)
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

/**
 * Returns all potential lookup representations of a slug to guarantee matching
 * in database queries regardless of whether the slug was stored decoded,
 * single-encoded, double-encoded, raw, space-separated, plus-separated, or hyphenated.
 */
export function getSlugLookupVariants(input: string | string[] | undefined | null): string[] {
  if (!input) return [];

  const raw = Array.isArray(input) ? input.filter(Boolean).join("/") : String(input).trim();
  const decoded = decodeSlug(raw);
  if (!decoded && !raw) return [];

  const variants = new Set<string>();

  // Base raw and decoded representations
  if (raw) variants.add(raw);
  if (decoded) {
    variants.add(decoded);
    // Unicode normalizations
    try {
      variants.add(decoded.normalize("NFC"));
      variants.add(decoded.normalize("NFD"));
      variants.add(decoded.normalize("NFKC"));
    } catch {}
  }

  // Generate space/hyphen/underscore/plus transformations
  const baseCandidates = Array.from(variants);
  for (const base of baseCandidates) {
    if (!base) continue;

    // Hyphenated variant (spaces/underscores/plus to hyphens)
    const hyphenated = base.replace(/[\s_+]+/g, "-");
    variants.add(hyphenated);

    // Spaced variant (hyphens/underscores/plus to spaces)
    const spaced = base.replace(/[-_+]+/g, " ").trim();
    if (spaced) variants.add(spaced);

    // Underscore variant
    const underscored = base.replace(/[\s-+]+/g, "_");
    if (underscored) variants.add(underscored);

    // If string has plus signs
    if (base.includes("+")) {
      const plusToSpace = base.replace(/\+/g, " ");
      variants.add(plusToSpace);
      variants.add(plusToSpace.replace(/\s+/g, "-"));
    }

    // Slugified version
    const cleanSlug = slugify(base);
    if (cleanSlug) variants.add(cleanSlug);
  }

  // For each variant, also add standard uppercase and lowercase URL encoded versions
  const allCurrent = Array.from(variants);
  for (const v of allCurrent) {
    try {
      const enc = encodeURIComponent(v);
      variants.add(enc);
      variants.add(enc.toLowerCase());

      // Double encoded version
      const doubleEnc = encodeURIComponent(enc);
      variants.add(doubleEnc);
    } catch {}
  }

  return Array.from(variants).filter((v) => Boolean(v && v.trim().length > 0));
}
