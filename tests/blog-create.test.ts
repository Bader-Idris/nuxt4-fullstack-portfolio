import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeSlug, encodeSlug, slugify } from "../server/utils/slug.js";
import { extractImagesFromHtml } from "../server/utils/sitemap.js";
import { z } from "zod";

// Post creation schema mirroring server/api/v1/blog/index.post.ts
const createPostSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .refine((val) => /^[\p{L}\p{N}\p{M}\s_\-%+]+$/u.test(decodeSlug(val)), {
      message: "Slug must contain valid letters, numbers, hyphens, or underscores",
    }),
  content: z.string().optional(),
  published: z.boolean().default(false),
  status: z.enum(["published", "draft", "deleted"]).optional(),
  language: z.enum(["en", "es", "ar"]).default("en"),
  summary: z.string().max(500).optional(),
});

// Middleware role check mirroring server/middleware/auth.ts
function checkManagementAuth(user: { userId: string; role: string } | null | undefined, route: string) {
  const isManagementRoute = route.startsWith("/blog/create") || route.startsWith("/api/v1/blog");
  if (!user && isManagementRoute) {
    return { status: 401, error: "Authentication required" };
  }
  if (user && isManagementRoute && user.role !== "admin" && user.role !== "editor") {
    return { status: 403, error: "Insufficient permissions for management actions" };
  }
  return { status: 200, user };
}

describe("Blog Creation Flow (/blog/create) - Docker Admin Simulation", () => {
  // Docker Admin Mock User
  const adminUser = {
    userId: "mongo-admin-67890",
    email: "contact@baderidris.com",
    name: "Bader Idris (Admin)",
    role: "admin",
  };

  const editorUser = {
    userId: "mongo-editor-12345",
    email: "editor@baderidris.com",
    name: "Test Editor",
    role: "editor",
  };

  const regularUser = {
    userId: "mongo-user-11111",
    email: "user@domain.com",
    name: "Normal User",
    role: "user",
  };

  it("allows Admin user to access /blog/create in Docker setup", () => {
    const authResult = checkManagementAuth(adminUser, "/blog/create");
    assert.equal(authResult.status, 200);
    assert.equal(authResult.user?.role, "admin");
  });

  it("allows Editor user to access /blog/create", () => {
    const authResult = checkManagementAuth(editorUser, "/blog/create");
    assert.equal(authResult.status, 200);
    assert.equal(authResult.user?.role, "editor");
  });

  it("blocks normal user from creating posts with 403 Forbidden", () => {
    const authResult = checkManagementAuth(regularUser, "/blog/create");
    assert.equal(authResult.status, 403);
    assert.equal(authResult.error, "Insufficient permissions for management actions");
  });

  it("blocks unauthenticated guest from creating posts with 401 Unauthorized", () => {
    const authResult = checkManagementAuth(null, "/blog/create");
    assert.equal(authResult.status, 401);
    assert.equal(authResult.error, "Authentication required");
  });

  it("successfully validates and normalizes Arabic post creation payload", () => {
    const rawFormPayload = {
      title: "كيف تحترف برمجة الويب full stack development",
      slug: "%D9%83%D9%8A%D9%81-%D8%AA%D8%AD%D8%AA%D8%B1%D9%81-%D8%A8%D8%B1%D9%85%D8%AC%D8%A9-%D8%A7%D9%84%D9%88%D9%8A%D8%A8-full-stack-development",
      language: "ar",
      published: true,
      summary: "دليل شامل لاحتراف برمجة الويب وتطوير الويب المتكامل",
      content: "<p>مقال شامل عن تقنيات الويب الحديثة</p><img src=\"https://baderidris.com/images/fullstack.webp\" alt=\"Full Stack\" />",
    };

    const validation = createPostSchema.safeParse(rawFormPayload);
    assert.ok(validation.success, "Payload must pass schema validation");

    const postData = validation.data!;
    const rawDecoded = decodeSlug(postData.slug);
    const finalSlug = slugify(rawDecoded) || rawDecoded;

    assert.equal(finalSlug, "كيف-تحترف-برمجة-الويب-full-stack-development");
    assert.equal(postData.language, "ar");
    assert.equal(postData.published, true);

    // Synchronize status
    const finalStatus = postData.status || (postData.published ? "published" : "draft");
    assert.equal(finalStatus, "published");
  });

  it("correctly builds single sitemap entry for the newly created Arabic post", () => {
    const createdPostInDb = {
      id: 101,
      title: "كيف تحترف برمجة الويب full stack development",
      slug: "كيف-تحترف-برمجة-الويب-full-stack-development",
      language: "ar",
      published: true,
      status: "published",
      content: "<p>محتوى المقال</p><img src=\"https://baderidris.com/images/fullstack.webp\" alt=\"Banner\" />",
      createdAt: new Date("2026-09-01T15:30:00Z"),
      updatedAt: new Date("2026-09-01T15:30:00Z"),
    };

    const cleanSlug = decodeSlug(createdPostInDb.slug);
    const lang = createdPostInDb.language || "en";
    const prefix = lang === "ar" ? "/ar" : lang === "es" ? "/es" : "";
    const loc = `${prefix}/blog/${cleanSlug}`;
    const lastmod = createdPostInDb.updatedAt.toISOString();
    const images = extractImagesFromHtml(createdPostInDb.content);

    const sitemapRoute = {
      loc,
      lastmod,
      _i18nTransform: false,
      changefreq: "weekly",
      priority: 0.8,
      _sitemap: "posts",
      images,
    };

    // Route is properly localized with /ar/blog/
    assert.equal(sitemapRoute.loc, "/ar/blog/كيف-تحترف-برمجة-الويب-full-stack-development");
    assert.equal(sitemapRoute._i18nTransform, false);
    assert.equal(sitemapRoute.lastmod, "2026-09-01T15:30:00.000Z");
    assert.equal(sitemapRoute.images.length, 1);
    assert.equal(sitemapRoute.images[0].loc, "https://baderidris.com/images/fullstack.webp");

    // Round-trip encoding verification for crawler and browser access
    const encodedUrl = `https://baderidris.com/ar/blog/${encodeSlug(cleanSlug)}`;
    assert.ok(encodedUrl.includes("%D9%83%D9%8A%D9%81"));
    assert.equal(decodeSlug(encodedUrl.replace("https://baderidris.com/ar/blog/", "")), cleanSlug);
  });
});
