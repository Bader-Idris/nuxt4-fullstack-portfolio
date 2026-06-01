<template>
  <div ref="blogPostContainer" class="blog-post-page" dir="auto">
    <div v-if="status === 'pending'" class="loader-container">
      <CustomLoader />
    </div>
    <div v-else-if="error" class="error-container">
      <h1>{{ t('blog.notFound', 'Post Not Found') }}</h1>
      <NuxtLink :to="localePath('/blog')">{{ t('blog.backToBlog', 'Back to Blog') }}</NuxtLink>
    </div>
    <article v-else-if="postData" class="post-article">
      <header class="post-header">
        <div v-if="!postData.published" class="unpublished-badge">
          Draft
        </div>
        <h1 class="post-title" dir="auto">{{ postData.title }}</h1>
        <div class="post-meta">
          <time :datetime="postData.createdAt">{{ formatDate(postData.createdAt) }}</time>
          <span class="author">By {{ postData.author.name }}</span>
          <span class="views"><Icon name="material-symbols:visibility" /> {{ postData.viewCount }}</span>
          <span class="language-badge">{{ postData.language.toUpperCase() }}</span>
        </div>
      </header>
      
      <BlogContent :content="postData.content" />
      
      <footer class="post-footer">
        <div v-if="postData.summary" class="post-summary">
          <h3>Summary</h3>
          <p>{{ postData.summary }}</p>
        </div>
        
        <div class="post-actions" v-if="postData.isAuthor || isAdmin">
          <button @click="editPost" class="edit-btn">
            <Icon name="material-symbols:edit" /> Edit Post
          </button>
        </div>
      </footer>

      <!-- Comment Section -->
      <section class="comments-section">
        <h3>Comments ({{ postData.commentCount }})</h3>
        <BlogCommentSection :post-slug="slug" />
      </section>
    </article>
    <ScrollToTop :target="blogPostContainer" />
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/useUserSocket";

const blogPostContainer = ref<HTMLElement | null>(null);
useMiddleClickScroll(blogPostContainer);

const route = useRoute();
const localePath = useLocalePath();
const { t, locale } = useI18n();
const config = useRuntimeConfig();
const userStore = useUserStore();

const slug = computed(() => {
  const s = route.params.slug;
  return Array.isArray(s) ? s.join('/') : s;
});

const { data: response, status, error } = await useFetch<any>(() => `/api/v1/blog/${slug.value}`, {
  key: `blog-${slug.value}-${locale.value}`,
  headers: {
    'x-locale': locale.value
  }
});

const postData = computed(() => response.value?.data);
const isAdmin = computed(() => userStore.getUserRole === 'admin');

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function editPost() {
  // Navigation to editor page
  navigateTo(localePath(`/blog/edit/${slug.value}`));
}

// Dynamic SEO
useSeoMeta({
  title: () => postData.value?.title || t('blog.loading', 'Loading...'),
  description: () => postData.value?.summary,
  ogTitle: () => postData.value?.title,
  ogDescription: () => postData.value?.summary,
  ogImage: () => `${config.public.originUrl}/thumbnail.webp`,
  twitterCard: 'summary_large_image',
});

useSchemaOrg([
  defineArticle({
    headline: () => postData.value?.title,
    description: () => postData.value?.summary,
    datePublished: () => postData.value?.createdAt,
    author: [
      { name: postData.value?.author.name || 'Bader Idris' }
    ],
  })
]);
</script>

<style lang="scss" scoped>
.blog-post-page {
  @include mainMiddleSettings;
  padding: 2rem;

  @include mobile {
    @include phone-borders;
    overflow-y: scroll !important;
    padding: 1rem;
  }
}

.post-header {
  margin-bottom: 3rem;
  border-bottom: 1px solid $lines;
  padding-bottom: 1.5rem;
  position: relative;

  .unpublished-badge {
    position: absolute;
    top: -20px;
    left: 0;
    background: var(--accent-error);
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .post-title {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: $gradients1;
    line-height: 1.2;
    
    @include mobile {
      font-size: 2rem;
    }
  }

  .post-meta {
    font-size: 0.95rem;
    color: $secondary1;
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: center;

    .views, .language-badge {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .language-badge {
      background: $primary3;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 0.75rem;
    }
  }
}

.post-footer {
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid $lines;

  .post-summary {
    background: $primary3;
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    h3 { margin-top: 0; color: $secondary1; font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; }
    p { margin-bottom: 0; font-style: italic; }
  }

  .post-actions {
    display: flex;
    justify-content: flex-end;
    
    .edit-btn {
      background: $accent1;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: bold;
      transition: opacity 0.2s;
      &:hover { opacity: 0.8; }
    }
  }
}

.comments-section {
  margin-top: 4rem;
  h3 {
    font-size: 1.5rem;
    margin-bottom: 2rem;
    color: $secondary2;
    border-bottom: 2px solid $lines;
    padding-bottom: 10px;
    display: inline-block;
  }
}

.loader-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}
</style>
