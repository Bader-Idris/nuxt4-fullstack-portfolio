import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeSlug, encodeSlug, slugify, getSlugLookupVariants } from "../server/utils/slug.js";

describe("Universal Slug Decoding & Normalization", () => {
  it("decodes basic English slugs cleanly", () => {
    assert.equal(decodeSlug("hello-world"), "hello-world");
    assert.equal(decodeSlug("/hello-world/"), "hello-world");
    assert.equal(decodeSlug("  hello-world  "), "hello-world");
  });

  it("decodes space-enriched slugs and URL percent encodings", () => {
    assert.equal(decodeSlug("my first post"), "my first post");
    assert.equal(decodeSlug("my%20first%20post"), "my first post");
    assert.equal(decodeSlug("my%20%20first%20post"), "my  first post");
  });

  it("decodes single, double, and multi-level percent encoded strings", () => {
    const rawArabic = "مقال-تجريبي";
    const singleEncoded = encodeURIComponent(rawArabic);
    const doubleEncoded = encodeURIComponent(singleEncoded);
    const tripleEncoded = encodeURIComponent(doubleEncoded);

    assert.equal(decodeSlug(singleEncoded), rawArabic);
    assert.equal(decodeSlug(doubleEncoded), rawArabic);
    assert.equal(decodeSlug(tripleEncoded), rawArabic);
  });

  it("handles non-English languages across Unicode scripts", () => {
    // Arabic
    assert.equal(decodeSlug("مقال-تجريبي-للمطورين"), "مقال-تجريبي-للمطورين");
    assert.equal(
      decodeSlug("%D9%85%D9%82%D8%A7%D9%84-%D8%AA%D8%AC%D8%B1%D9%8A%D8%A8%D9%8A"),
      "مقال-تجريبي"
    );

    // Spanish with accents
    assert.equal(decodeSlug("artículo-de-programación"), "artículo-de-programación");
    assert.equal(
      decodeSlug("art%C3%ADculo-de-programaci%C3%B3n"),
      "artículo-de-programación"
    );

    // German
    assert.equal(decodeSlug("über-große-träume"), "über-große-träume");
    assert.equal(decodeSlug("%C3%BCber-uns"), "über-uns");

    // French
    assert.equal(decodeSlug("café-crème-brûlée"), "café-crème-brûlée");

    // Russian / Cyrillic
    assert.equal(decodeSlug("Привет-мир"), "Привет-мир");
    assert.equal(
      decodeSlug("%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82-%D0%BC%D0%B8%D1%80"),
      "Привет-мир"
    );

    // Japanese / Kanji & Kana
    assert.equal(decodeSlug("こんにちは-世界"), "こんにちは-世界");
    assert.equal(
      decodeSlug("%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%81%AF"),
      "こんにちは"
    );

    // Chinese
    assert.equal(decodeSlug("你好-世界"), "你好-世界");

    // Hebrew
    assert.equal(decodeSlug("שלום-עולם"), "שלום-עולם");
  });

  it("handles array inputs safely", () => {
    assert.equal(decodeSlug(["blog", "my-post"]), "blog/my-post");
    assert.equal(decodeSlug(["مقال", "تجريبي"]), "مقال/تجريبي");
    assert.equal(decodeSlug(["%D9%85%D9%82%D8%A7%D9%84"]), "مقال");
  });

  it("handles empty, null, and undefined inputs gracefully", () => {
    assert.equal(decodeSlug(undefined), "");
    assert.equal(decodeSlug(null), "");
    assert.equal(decodeSlug(""), "");
    assert.equal(decodeSlug([]), "");
  });
});

describe("SEO-friendly slugify helper", () => {
  it("converts titles with mixed Unicode, spaces, and punctuation to clean slugs", () => {
    assert.equal(slugify("Hello World! 2026"), "hello-world-2026");
    assert.equal(slugify("مقال تجريبي رائع جداً!"), "مقال-تجريبي-رائع-جداً");
    assert.equal(
      slugify("Guía de Programación & Diseño"),
      "guía-de-programación-diseño"
    );
    assert.equal(slugify("Nuxt 4 + Vue 3 في 2026"), "nuxt-4-vue-3-في-2026");
    assert.equal(slugify("  --- spaces --- and --- hyphens --- "), "spaces-and-hyphens");
  });

  it("preserves non-English characters in slugify", () => {
    assert.equal(slugify("Über uns"), "über-uns");
    assert.equal(slugify("こんにちは 世界"), "こんにちは-世界");
    assert.equal(slugify("Привет Мир 123"), "привет-мир-123");
  });
});

describe("Comprehensive getSlugLookupVariants for DB Matching", () => {
  it("generates variants allowing encoded, decoded, and spaced matches", () => {
    const targetSlug = "مقال-تجريبي";

    // Scenario 1: AI visits decoded URL with spaces "مقال تجريبي"
    const variantsSpaced = getSlugLookupVariants("مقال تجريبي");
    assert.ok(
      variantsSpaced.includes(targetSlug),
      `Variants for 'مقال تجريبي' must include '${targetSlug}'. Got: ${JSON.stringify(variantsSpaced)}`
    );

    // Scenario 2: AI visits single percent-encoded URL
    const singleEnc = encodeURIComponent(targetSlug);
    const variantsSingle = getSlugLookupVariants(singleEnc);
    assert.ok(
      variantsSingle.includes(targetSlug),
      `Variants for '${singleEnc}' must include '${targetSlug}'.`
    );

    // Scenario 3: AI visits double percent-encoded URL
    const doubleEnc = encodeURIComponent(singleEnc);
    const variantsDouble = getSlugLookupVariants(doubleEnc);
    assert.ok(
      variantsDouble.includes(targetSlug),
      `Variants for double-encoded must include '${targetSlug}'.`
    );

    // Scenario 4: AI visits space-encoded URL (%20)
    const spaceEnc = encodeURIComponent("مقال تجريبي");
    const variantsSpaceEnc = getSlugLookupVariants(spaceEnc);
    assert.ok(
      variantsSpaceEnc.includes(targetSlug),
      `Variants for '${spaceEnc}' must include '${targetSlug}'.`
    );

    // Scenario 5: AI visits plus-encoded URL (+)
    const plusEnc = "مقال+تجريبي";
    const variantsPlus = getSlugLookupVariants(plusEnc);
    assert.ok(
      variantsPlus.includes(targetSlug),
      `Variants for '${plusEnc}' must include '${targetSlug}'.`
    );

    // Scenario 6: AI visits underscore-encoded URL (_)
    const underscoreSlug = "مقال_تجريبي";
    const variantsUnderscore = getSlugLookupVariants(underscoreSlug);
    assert.ok(
      variantsUnderscore.includes(targetSlug),
      `Variants for '${underscoreSlug}' must include '${targetSlug}'.`
    );
  });

  it("handles English and Spanish space and encoded variants", () => {
    const targetSpanish = "artículo-de-prueba";
    const variants1 = getSlugLookupVariants("artículo de prueba");
    assert.ok(variants1.includes(targetSpanish));

    const variants2 = getSlugLookupVariants(encodeURIComponent("artículo-de-prueba"));
    assert.ok(variants2.includes(targetSpanish));

    const targetEnglish = "robust-cms-feature";
    const variantsEnglish = getSlugLookupVariants("robust cms feature");
    assert.ok(variantsEnglish.includes(targetEnglish));
  });

  it("returns unique and non-empty variants", () => {
    const variants = getSlugLookupVariants("مقال تجريبي");
    const uniqueVariants = Array.from(new Set(variants));
    assert.equal(variants.length, uniqueVariants.length);
    assert.ok(!variants.includes(""));
  });
});
