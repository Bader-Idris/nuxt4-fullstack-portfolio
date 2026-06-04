<template>
  <div class="blog-list-container">
    <div class="blog-list-page">
      <header class="page-header">
        <h1 class="page-title">{{ t('blog.title', 'Blog') }}</h1>
        <div class="header-actions">
          <ClientOnly>
            <NuxtLink 
              v-if="canCreate" 
              :to="localePath('/blog/create')" 
              class="create-post-btn"
            >
              <Icon name="material-symbols:add-circle-outline" />
              {{ t('blog.createPost', 'Create Post') }}
            </NuxtLink>
          </ClientOnly>
          <div class="language-filter">
            <button 
              v-for="l in ['en', 'es', 'ar']" 
              :key="l" 
              :class="{ 'active': selectedLang === l }"
              @click="selectedLang = l"
            >
              {{ l.toUpperCase() }}
            </button>
          </div>
        </div>
      </header>

      <div v-if="pending" class="loader-container">
        <CustomLoader />
      </div>
      <div v-else-if="posts && posts.length > 0" class="posts-grid">
        <NuxtLink 
          v-for="post in posts" 
          :key="post.id" 
          :to="localePath('/blog/' + post.slug)"
          class="post-card"
        >
          <div class="post-content">
            <span class="post-lang">{{ post.language.toUpperCase() }}</span>
            <h2 class="post-card-title">{{ post.title }}</h2>
            <p class="post-summary">{{ post.summary || '...' }}</p>
            <div class="post-meta">
              <time class="post-date">{{ formatDateSeparator(post.createdAt) }}</time>
              <span class="post-views"><Icon name="material-symbols:visibility" /> {{ post.viewCount }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
      <div v-else class="no-posts">
        <p>{{ t('blog.noPosts', 'No posts found.') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/useUserSocket";

defineOgImage('Default', {
  title: 'Blog | Bader Idris',
  description: 'Explore insights on Vue, Nuxt, Node, and creative technologies.',
});

const userStore = useUserStore();
const { t, locale } = useI18n();
const localePath = useLocalePath();
const { formatDateSeparator } = useDateFormatter();
const selectedLang = ref(locale.value);

const canCreate = computed(() => {
  const role = userStore.getUserRole;
  return role === 'admin' || role === 'editor';
});

const { data: response, pending } = await useFetch<any>('/api/v1/blog', {
  query: { lang: selectedLang },
  watch: [selectedLang]
});

const posts = computed(() => response.value?.data || []);

useSeoMeta({
  title: 'Blog | Bader Idris',
});
</script>

<style scoped>
.blog-list-container {
  height: 100%;
  overflow-y: auto;
  padding: 0 1rem;
}

.blog-list-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 3rem 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #1e2d3d;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.create-post-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #43d9ad;
  color: #011221;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: bold;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.create-post-btn:hover {
  background: #45eaa2;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #e5e9f0;
  margin: 0;
}

.language-filter {
  display: flex;
  gap: 0.5rem;
}

.language-filter button {
  background: #011221;
  border: 1px solid #1e2d3d;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  color: #607b96;
  cursor: pointer;
  transition: all 0.2s;
}

.language-filter button.active {
  background: #fea55f;
  color: #011221;
  border-color: #fea55f;
  font-weight: bold;
}

.posts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

.post-card {
  background: #011221;
  border: 1px solid #1e2d3d;
  border-radius: 12px;
  padding: 1.5rem;
  text-decoration: none;
  transition: transform 0.2s, border-color 0.2s;
}

.post-card:hover {
  transform: translateY(-4px);
  border-color: #43d9ad;
}

.post-lang {
  display: block;
  font-size: 0.75rem;
  color: #43d9ad;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.post-card-title {
  font-size: 1.5rem;
  color: #e5e9f0;
  margin: 0 0 0.75rem 0;
}

.post-summary {
  color: #607b96;
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #607b96;
}

.loader-container {
  display: flex;
  justify-content: center;
  padding: 4rem;
}

.no-posts {
  text-align: center;
  padding: 4rem;
  color: #607b96;
}
</style>
