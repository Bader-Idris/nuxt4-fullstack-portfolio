<template>
  <div class="blog-post-page" dir="auto">
    <div v-if="pending" class="loader-container">
      <CustomLoader />
    </div>
    <div v-else-if="error" class="error-container">
      <h1>{{ t('blog.notFound', 'Post Not Found') }}</h1>
      <NuxtLink to="/">{{ t('blog.backHome', 'Go Back Home') }}</NuxtLink>
    </div>
    <article v-else-if="post" class="post-article">
      <header class="post-header">
        <h1 class="post-title" dir="auto">{{ post.metadata.title }}</h1>
        <div class="post-meta">
          <time :datetime="post.metadata.date">{{ post.metadata.date }}</time>
          <span v-if="post.metadata.author" class="author">By {{ post.metadata.author }}</span>
        </div>
      </header>
      
      <BlogContent :content="htmlContent" />
      
      <footer class="post-footer">
        <div v-if="post.metadata.tags" class="tags">
          <span v-for="tag in post.metadata.tags.split(',')" :key="tag" class="tag">#{{ tag.trim() }}</span>
        </div>
      </footer>
    </article>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { t, locale } = useI18n();
const config = useRuntimeConfig();
// TODO: is zod useful here??

const slug = computed(() => {
  const s = route.params.slug;
  return Array.isArray(s) ? s.join('/') : s;
});

const { data: post, pending, error } = await useAsyncData(`blog-${slug.value}-${locale.value}`, () => {
  return $fetch(`/api/v1/blog/${slug.value}`, {
    headers: {
      'x-locale': locale.value
    }
  });
});

// For now, we'll assume the API returns HTML or we convert it here.
// In a real scenario, we'd use a proper markdown to HTML converter.
const htmlContent = computed(() => {
  if (!post.value) return '';
  // Very simple MD to HTML for demonstration, in production use marked or similar
  return post.value.content
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
    .replace(/\*(.*)\*/gim, '<i>$1</i>')
    .replace(/\n/g, '<br>');
});

// Dynamic SEO
useSeoMeta({
  title: () => post.value?.metadata.title || t('blog.loading', 'Loading...'),
  description: () => post.value?.metadata.description,
  ogTitle: () => post.value?.metadata.title,
  ogDescription: () => post.value?.metadata.description,
  ogImage: () => post.value?.metadata.ogImage || `${config.public.originUrl}/thumbnail.webp`,
  twitterCard: 'summary_large_image',
});

// Schema.org
useSchemaOrg([
  defineArticle({
    headline: () => post.value?.metadata.title,
    description: () => post.value?.metadata.description,
    datePublished: () => post.value?.metadata.date,
    author: [
      { name: post.value?.metadata.author || 'Bader Idris' }
    ],
    image: () => post.value?.metadata.ogImage || `${config.public.originUrl}/thumbnail.webp`,
  })
]);
</script>

<style lang="scss" scoped>
.blog-post-page {
  @include mainMiddleSettings;

  @include mobile {
    @include phone-borders;
    overflow-y: scroll !important;
    padding-right: 0;
  }
}

.post-header {
  margin-bottom: 40px;
  border-bottom: 1px solid $lines;
  padding-bottom: 20px;

  .post-title {
    font-size: 2.5rem;
    margin-bottom: 10px;
    color: $gradients1;
    
    @include mobile {
      font-size: 1.8rem;
    }
  }

  .post-meta {
    font-size: 0.9rem;
    color: $secondary1;
    display: flex;
    gap: 15px;
  }
}

.post-footer {
  margin-top: 60px;
  padding-top: 20px;
  border-top: 1px solid $lines;

  .tags {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;

    .tag {
      color: $accent1;
      font-weight: bold;
      font-size: 0.85rem;
    }
  }
}

.loader-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}
</style>
