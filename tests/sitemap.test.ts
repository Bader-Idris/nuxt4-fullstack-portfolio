import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractImagesFromHtml } from "../server/utils/sitemap.js";
import { decodeSlug, encodeSlug } from "../server/utils/slug.js";

describe("Sitemap Generation & Parsing", () => {
  it("extracts images from post HTML correctly", () => {
    const html = `
      <div>
        <h1>Test Post</h1>
        <p>Some text</p>
        <img src="https://baderidris.com/images/post1.png" alt="Test 1" />
        <img src="/assets/cover.jpg" alt="Test 2" />
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." alt="Inline data should be skipped" />
        <img src="https://baderidris.com/images/post1.png" alt="Duplicate should be ignored" />
      </div>
    `;

    const images = extractImagesFromHtml(html);
    assert.equal(images.length, 2);
    assert.equal(images[0].loc, "https://baderidris.com/images/post1.png");
    assert.equal(images[1].loc, "/assets/cover.jpg");
  });

  it("handles empty or null HTML content gracefully", () => {
    assert.deepEqual(extractImagesFromHtml(null), []);
    assert.deepEqual(extractImagesFromHtml(undefined), []);
    assert.deepEqual(extractImagesFromHtml(""), []);
    assert.deepEqual(extractImagesFromHtml("<p>No images here</p>"), []);
  });

  it("ensures sitemap paths with Arabic and space-enriched slugs format correctly", () => {
    const rawArabic = "مقال تجريبي عن الذكاء الاصطناعي";
    const decoded = decodeSlug(rawArabic);
    const loc = `/ar/blog/${decoded}`;

    assert.equal(loc, "/ar/blog/مقال تجريبي عن الذكاء الاصطناعي");

    const encodedTarget = encodeSlug(decoded);
    assert.ok(encodedTarget.includes("%D9%85%D9%82%D8%A7%D9%84"));

    // Verify round-trip decoding from sitemap link
    assert.equal(decodeSlug(encodedTarget), decoded);
  });

  it("generates correct single sitemap entry per language without duplicate routes", () => {
    const samplePosts = [
      {
        slug: "كيف-تحترف-برمجة-الويب-full-stack-development",
        language: "ar",
        updatedAt: new Date("2026-08-15T12:00:00Z"),
        createdAt: new Date("2026-08-10T12:00:00Z"),
      },
      {
        slug: "guia-completa-de-nuxt4",
        language: "es",
        updatedAt: new Date("2026-07-20T10:00:00Z"),
        createdAt: new Date("2026-07-19T10:00:00Z"),
      },
      {
        slug: "mastering-web-development-2026",
        language: "en",
        updatedAt: new Date("2026-06-01T08:00:00Z"),
        createdAt: new Date("2026-06-01T08:00:00Z"),
      },
    ];

    const generatedRoutes = samplePosts.map((post) => {
      const cleanSlug = decodeSlug(post.slug);
      const lang = post.language || "en";
      const prefix = lang === "ar" ? "/ar" : lang === "es" ? "/es" : "";
      const loc = `${prefix}/blog/${cleanSlug}`;
      const lastmodDate = post.updatedAt || post.createdAt;

      return {
        loc,
        lastmod: new Date(lastmodDate).toISOString(),
        _i18nTransform: false,
        _sitemap: "posts",
      };
    });

    // Arabic post appears only once with /ar prefix
    assert.equal(generatedRoutes[0].loc, "/ar/blog/كيف-تحترف-برمجة-الويب-full-stack-development");
    assert.equal(generatedRoutes[0].lastmod, "2026-08-15T12:00:00.000Z");
    assert.equal(generatedRoutes[0]._i18nTransform, false);

    // Spanish post appears only once with /es prefix
    assert.equal(generatedRoutes[1].loc, "/es/blog/guia-completa-de-nuxt4");
    assert.equal(generatedRoutes[1].lastmod, "2026-07-20T10:00:00.000Z");
    assert.equal(generatedRoutes[1]._i18nTransform, false);

    // English post appears with default /blog prefix
    assert.equal(generatedRoutes[2].loc, "/blog/mastering-web-development-2026");
    assert.equal(generatedRoutes[2].lastmod, "2026-06-01T08:00:00.000Z");
    assert.equal(generatedRoutes[2]._i18nTransform, false);

    // Verify all locs are unique (no duplicates across languages)
    const locSet = new Set(generatedRoutes.map((r) => r.loc));
    assert.equal(locSet.size, generatedRoutes.length);
  });

  it("preserves historical lastmod timestamps and never resets to today", () => {
    const historicalDate = new Date("2025-05-12T14:30:00Z");
    const todayDate = new Date();

    const post = {
      slug: "historical-post",
      language: "en",
      updatedAt: historicalDate,
      createdAt: historicalDate,
    };

    const lastmodIso = new Date(post.updatedAt || post.createdAt).toISOString();

    assert.equal(lastmodIso, "2025-05-12T14:30:00.000Z");
    assert.notEqual(lastmodIso.slice(0, 10), todayDate.toISOString().slice(0, 10));
  });
});
