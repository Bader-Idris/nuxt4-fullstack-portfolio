// content.config.ts
import { defineCollection, z } from "@nuxt/content";
import { asSeoCollection } from "@nuxtjs/seo/content";

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

export const collections = {
  projects_en: defineCollection(
    asSeoCollection({
      type: "page",
      source: {
        include: "en/projects/*.md",
        exclude: ["index.**"],
        prefix: "/projects",
      },
      schema: commonProjectSchema,
    })
  ),
  projects_ar: defineCollection(
    asSeoCollection({
      type: "page",
      source: {
        include: "ar/projects/*.md",
        exclude: ["index.**"],
        prefix: "/ar/projects",
      },
      schema: commonProjectSchema,
    })
  ),
  projects_es: defineCollection(
    asSeoCollection({
      type: "page",
      source: {
        include: "es/projects/*.md",
        exclude: ["index.**"],
        prefix: "/es/projects",
      },
      schema: commonProjectSchema,
    })
  ),
};
