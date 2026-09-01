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
    const loc = `/blog/${decoded}`;

    assert.equal(loc, "/blog/مقال تجريبي عن الذكاء الاصطناعي");

    const encodedTarget = encodeSlug(decoded);
    assert.ok(encodedTarget.includes("%D9%85%D9%82%D8%A7%D9%84"));

    // Verify round-trip decoding from sitemap link
    assert.equal(decodeSlug(encodedTarget), decoded);
  });
});
