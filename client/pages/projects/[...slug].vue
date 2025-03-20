<script setup lang="ts">
// TODO: requires many fixes, nuxt content is ugly yo
import { withLeadingSlash, joinURL } from 'ufo'

const route = useRoute()
const localePath = useLocalePath()
const { locale, localeProperties, t } = useI18n()

// Get the slug from the route params
const slug = computed(() => Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug])
const path = computed(() => withLeadingSlash(joinURL(...slug.value)))

// Determine the collection based on current locale
const collection = computed(() => {
  if (locale.value === 'en') return 'projects_en'
  if (locale.value === 'ar') return 'projects_ar'
  return 'projects_es'
})

// Find the project from the content collection
const { data: content } = await useAsyncData(
  `project-${path.value}`,
  () => queryCollection(collection.value).path(path.value).first()
)

// Find the project from your JSON data as fallback
const projects = await import('~/apis/projects_info.json').then(m => m.default)
const jsonProject = computed(() => {
  return projects.find(p => slugify(p.title) === slug.value[slug.value.length - 1])
})

// Combine data sources, preferring content module data when available
const project = computed(() => {
  if (content.value) {
    return {
      ...jsonProject.value,
      ...content.value
    }
  }
  return jsonProject.value
})

// Generate SEO metadata if project exists
if (project.value) {
  useSeoMeta({
    title: project.value.title,
    description: project.value.desc,
    ogTitle: project.value.title,
    ogDescription: project.value.desc,
    ogImage: project.value.img,
  })
}

// Helper function to go back to projects page
function goBack() {
  navigateTo(localePath('/projects'));
}

// Slugify function for URL formatting
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
</script>

<template>
  <div class="project-detail">
    <div v-if="project" class="project-content">
      <header>
        <h1>{{ project.title }}</h1>
        <div class="project-meta">
          <span v-if="project.date" class="date">{{ project.date }}</span>
          <div class="tags">
            <span v-for="tag in project.tags" :key="tag" class="tag">{{ tag
            }}</span>
          </div>
        </div>
      </header>

      <div class="project-image" v-if="project.img">
        <img :src="project.img" :alt="project.imgAlt || project.title">
      </div>

      <div class="project-description" v-if="project.desc">
        <p>{{ project.desc }}</p>
      </div>

      <div class="project-actions">
        <a v-if="project.url" 
          :href="project.url" 
          target="_blank"
          class="external-link">Visit Live Project</a>
        <button @click="goBack" class="back-button">Back to Projects</button>
      </div>

      <!-- Render the full Markdown content -->
      <div class="markdown-content">
        <ContentRenderer 
          v-if="content" 
          :value="content"
          :dir="localeProperties?.dir ?? 'ltr'" 
          prose 
        />
      </div>
    </div>
    <div v-else class="loading">
      <p>{{ $t('projects.loading') || 'Loading project...' }}</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.project-detail {
  overflow-y: scroll !important;
  padding: 2rem;

  @include mainMiddleSettings;

  @media (max-width: 768px) {
    @include phone-borders;
    padding: 1rem;
  }

  .project-content {
    max-width: 1200px;
    margin: 0 auto;
  }

  header {
    margin-bottom: 2rem;

    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .project-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;

      .date {
        font-style: italic;
      }

      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;

        .tag {
          padding: 0.25rem 0.5rem;
          background-color: var(--color-accent);
          border-radius: 4px;
          font-size: 0.875rem;
        }
      }
    }
  }

  .project-image {
    margin-bottom: 2rem;

    img {
      width: 100%;
      height: auto;
      border-radius: 8px;
    }
  }

  .markdown-content {
    margin-top: 2rem;

    :deep(.prose) {
      /* Base styles for prose content */
      max-width: 100%;

      /* Headings */
      h2 {
        font-size: 1.75rem;
        margin: 1.5rem 0 1rem;
        font-weight: 600;
      }

      h3 {
        font-size: 1.5rem;
        margin: 1.25rem 0 0.75rem;
        font-weight: 600;
      }

      /* Paragraphs */
      p {
        margin-bottom: 1rem;
        line-height: 1.6;
      }

      /* Lists */
      ul,
      ol {
        margin-bottom: 1rem;
        padding-left: 1.5rem;
      }

      li {
        margin-bottom: 0.5rem;
      }

      /* Nested lists */
      li>ul,
      li>ol {
        margin-top: 0.5rem;
        margin-bottom: 0;
      }

      /* Blockquotes */
      blockquote {
        border-left: 4px solid var(--color-accent, #3b82f6);
        padding-left: 1rem;
        margin: 1rem 0;
        font-style: italic;
        color: var(--color-text-muted, #6b7280);
      }

      /* Code blocks and inline code */
      code {
        background-color: rgba(0, 0, 0, 0.05);
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-family: monospace;
      }

      pre {
        background-color: #f5f5f5;
        padding: 1rem;
        border-radius: 4px;
        overflow-x: auto;
        margin: 1rem 0;
      }

      pre code {
        background-color: transparent;
        padding: 0;
      }

      /* Horizontal rule */
      hr {
        margin: 2rem 0;
        border: 0;
        border-top: 1px solid var(--color-border, #e5e7eb);
      }

      /* Images */
      img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 1rem 0;
      }

      /* Links */
      a {
        color: var(--color-primary, #3b82f6);
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      a:hover {
        text-decoration: none;
      }
    }
  }

  .project-actions {
    display: flex;
    gap: 1rem;
    margin: 2rem 0;

    a,
    button {
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }

    .external-link {
      background-color: var(--color-primary, #3b82f6);
      color: white;
    }

    .back-button {
      background-color: transparent;
      border: 1px solid var(--color-border, #e5e7eb);
    }
  }
}
</style>