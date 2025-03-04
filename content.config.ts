import { defineCollection, defineContentConfig } from '@nuxt/content'
import { asSchemaOrgCollection } from 'nuxt-schema-org/content'

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      // Load every file inside the `content` directory
      source: '**',
      // Specify the type of content in this collection
      type: 'page',
    }),
    // for nuxt seo, TODO: check how to enable both!
    content: defineCollection(
      asSchemaOrgCollection({
        type: 'page',
        source: '**/*.md',
      }),
    ),
  }
})
