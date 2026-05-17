import { defineCollection, z } from "@nuxt/content";
import { defineRobotsSchema } from "@nuxtjs/robots/content";
import { defineSitemapSchema } from "@nuxtjs/sitemap/content";
import { defineOgImageSchema } from "nuxt-og-image/content";
import { defineSchemaOrgSchema } from "nuxt-schema-org/content";

const commonProjectSchema = z.object({
  title: z.string().nonempty(),
  url: z.string().url(),
  img: z.string().url(),
  imgAlt: z.string().nonempty(),
  desc: z.string().nonempty(),
  tags: z.array(z.string().nonempty()),
  date: z.string().nonempty().optional(),
  featured: z.boolean().optional(),
});

const seoSchema = z.object({
  robots: defineRobotsSchema(),
  sitemap: defineSitemapSchema(),
  ogImage: defineOgImageSchema(),
  schemaOrg: defineSchemaOrgSchema(),
});

export const collections = {
  projects_en: defineCollection({
    type: "page",
    source: {
      include: "en/projects/*.md",
      exclude: ["index.**"],
      prefix: "/projects",
    },
    schema: commonProjectSchema.merge(seoSchema),
  }),
  projects_ar: defineCollection({
    type: "page",
    source: {
      include: "ar/projects/*.md",
      exclude: ["index.**"],
      prefix: "/ar/projects",
    },
    schema: commonProjectSchema.merge(seoSchema),
  }),
  projects_es: defineCollection({
    type: "page",
    source: {
      include: "es/projects/*.md",
      exclude: ["index.**"],
      prefix: "/es/projects",
    },
    schema: commonProjectSchema.merge(seoSchema),
  }),
};