import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeSlug, slugify } from "../server/utils/slug.js";
import { extractImagesFromHtml } from "../server/utils/sitemap.js";
import { z } from "zod";

// Schema for Enterprise Blog Post
const postSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z.string().min(1).max(255),
  content: z.string().min(1),
  published: z.boolean().default(false),
  language: z.enum(["en", "es", "ar"]).default("en"),
  summary: z.string().max(500).optional().or(z.literal("")),
});

// Helper to extract document outline / headings
function extractHeadings(html: string) {
  const regex = /<h([1-6])([^>]*)>(.*?)<\/h\1>/gi;
  const headings: { level: number; id: string; text: string }[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const attrs = match[2] || "";
    const idMatch = attrs.match(/id="([^"]*)"/i);
    const id = idMatch ? idMatch[1] : "";
    const rawText = match[3] || "";
    const text = rawText.replace(/<[^>]+>/g, "").trim();
    if (text) {
      headings.push({
        level,
        id: id || slugify(text),
        text,
      });
    }
  }
  return headings;
}

// Helper to calculate statistics
function calculateReadingStats(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const readingTime = Math.max(1, Math.ceil(words / 200));
  return { words, readingTime };
}

describe("Enterprise TipTap Blog CMS & Rich Editing Suite", () => {
  const sampleEnterpriseHtml = `
    <h1 id="enterprise-architecture">Enterprise Cloud Architecture</h1>
    <p>Modern full-stack architectures demand robust rich text and structured content.</p>
    
    <div data-callout-type="tip" class="blog-callout blog-callout-tip">
      <p>Pro tip: Always decouple your headless CMS editor from rendering tiers.</p>
    </div>

    <h2 id="table-comparison">Benchmark Comparison</h2>
    <table>
      <thead>
        <tr>
          <th>Framework</th>
          <th>RPS</th>
          <th>Latency (p99)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Nuxt 4 Nitro</td>
          <td>48,000</td>
          <td>4.2ms</td>
        </tr>
        <tr>
          <td>Traditional SSR</td>
          <td>18,500</td>
          <td>14.8ms</td>
        </tr>
      </tbody>
    </table>

    <h2 id="checklist-tasks">Migration Checklist</h2>
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="true"><div><p>Configure TipTap starter kit and lowlight</p></div></li>
      <li data-type="taskItem" data-checked="true"><div><p>Implement H1-H6 anchor deep links</p></div></li>
      <li data-type="taskItem" data-checked="false"><div><p>Perform load testing in Docker environment</p></div></li>
    </ul>

    <h2 id="code-walkthrough">Code Implementation</h2>
    <pre><code class="language-typescript">import { defineNuxtConfig } from "nuxt/config";
export default defineNuxtConfig({
  ssr: true,
});</code></pre>

    <h3 id="media-showcase">Interactive Architecture Diagram</h3>
    <img src="https://baderidris.com/images/architecture.png" alt="Architecture Diagram" />

    <div data-youtube-video="true">
      <iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>
    </div>

    <p>Confidential password: <span class="tg-spoiler">super-secret-token</span></p>
  `;

  it("validates enterprise blog post containing tables, callouts, code blocks, and media", () => {
    const payload = {
      title: "Building Enterprise Full-Stack Blogs with Nuxt 4 & TipTap",
      slug: "building-enterprise-full-stack-blogs-nuxt-4-tiptap",
      content: sampleEnterpriseHtml,
      summary: "In-depth guide covering enterprise rich text editing, tables, callouts, and performance.",
      language: "en" as const,
      published: true,
    };

    const result = postSchema.safeParse(payload);
    assert.ok(result.success, "Enterprise post payload must pass schema validation");
    assert.equal(result.data?.published, true);
    assert.equal(result.data?.language, "en");
  });

  it("extracts structured document outline (H1, H2, H3) for Table of Contents", () => {
    const outline = extractHeadings(sampleEnterpriseHtml);
    assert.equal(outline.length, 5);

    assert.deepEqual(outline[0], {
      level: 1,
      id: "enterprise-architecture",
      text: "Enterprise Cloud Architecture",
    });

    assert.deepEqual(outline[1], {
      level: 2,
      id: "table-comparison",
      text: "Benchmark Comparison",
    });

    assert.deepEqual(outline[2], {
      level: 2,
      id: "checklist-tasks",
      text: "Migration Checklist",
    });

    assert.deepEqual(outline[3], {
      level: 2,
      id: "code-walkthrough",
      text: "Code Implementation",
    });

    assert.deepEqual(outline[4], {
      level: 3,
      id: "media-showcase",
      text: "Interactive Architecture Diagram",
    });
  });

  it("calculates accurate word count and reading time for enterprise articles", () => {
    const stats = calculateReadingStats(sampleEnterpriseHtml);
    assert.ok(stats.words > 30, "Word count should strip tags and count textual words");
    assert.ok(stats.readingTime >= 1, "Reading time should be at least 1 minute");
  });

  it("extracts media images embedded inside rich content for sitemaps", () => {
    const images = extractImagesFromHtml(sampleEnterpriseHtml);
    assert.equal(images.length, 1);
    assert.equal(images[0].loc, "https://baderidris.com/images/architecture.png");
  });

  it("supports multilingual enterprise headers with Arabic script", () => {
    const arabicHtml = `
      <h1 id="مقدمة-عن-البرمجة">مقدمة شاملة عن تقنيات الحوسبة السحابية</h1>
      <p>محتوى المقال باللغة العربية</p>
      <h2 id="الميزات-الرئيسية">الميزات الأساسية</h2>
      <table>
        <thead><tr><th>الخاصية</th><th>الوصف</th></tr></thead>
        <tbody><tr><td>الأمان</td><td>تشفير متكامل</td></tr></tbody>
      </table>
    `;

    const outline = extractHeadings(arabicHtml);
    assert.equal(outline.length, 2);
    assert.equal(outline[0].level, 1);
    assert.equal(outline[0].text, "مقدمة شاملة عن تقنيات الحوسبة السحابية");
    assert.equal(outline[1].level, 2);
    assert.equal(outline[1].text, "الميزات الأساسية");
  });
});
