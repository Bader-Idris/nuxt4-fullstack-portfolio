<template>
  <div class="blog-list-page">
    <header class="page-header">
      <h1 v-gsap="{ y: 0, opacity: 1, from: { y: 50, opacity: 0 } }">{{ t('blog.title', 'Blog') }}</h1>
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
    </header>

    <div v-if="pending" class="loader-container">
      <CustomLoader />
    </div>
    <div v-else-if="posts && posts.length > 0" class="posts-grid">
      <NuxtLink 
        v-for="(post, index) in posts" 
        :key="post.id" 
        :to="localePath('/blog/' + post.slug)"
        class="post-card"
        v-gsap="{ play: 'onScroll', y: 0, opacity: 1, from: { y: 100, opacity: 0 }, delay: index * 0.1 }"
      >
        <div class="post-content">
          <div class="post-lang">{{ post.language.toUpperCase() }}</div>
          <h2>{{ post.title }}</h2>
          <p>{{ post.summary || 'No summary available.' }}</p>
          <div class="post-footer">
            <span class="date">{{ formatDate(post.createdAt) }}</span>
            <span class="views"><Icon name="material-symbols:visibility" /> {{ post.viewCount }}</span>
          </div>
        </div>
      </NuxtLink>
    </div>
    <div v-else class="no-posts">
      <p>{{ t('blog.noPosts', 'No posts found for this language.') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOgImageComponent('Default', {
  title: 'Blog',
  description: 'Explore insights on Vue, Nuxt, Node, and creative technologies.'
});

const { t, locale } = useI18n();
const localePath = useLocalePath();
const selectedLang = ref(locale.value);

const { data: response, pending } = await useFetch<any>('/api/v1/blog', {
  query: { lang: selectedLang },
  watch: [selectedLang]
});

const posts = computed(() => response.value?.data || []);

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(locale.value);
}
</script>

<style lang="scss" scoped>
.blog-list-page {
  overflow: auto;
  padding: 4rem 2rem;
  @include mainMiddleSettings;

  @include mobile {
    padding: 2rem 1rem;
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4rem;

  h1 { color: $gradients1; font-size: 3rem; margin: 0; }

  .language-filter {
    display: flex;
    gap: 10px;
    button {
      background: $primary3;
      border: 1px solid $lines;
      padding: 8px 16px;
      border-radius: 8px;
      color: $secondary1;
      cursor: pointer;
      transition: all 0.3s;
      &.active, &:hover {
        background: $accent1;
        color: white;
        border-color: $accent1;
      }
    }
  }
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

.post-card {
  background: $primary3;
  border: 1px solid $lines;
  border-radius: 16px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    border-color: $secondary2;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }

  .post-content {
    padding: 1.5rem;
    
    .post-lang { font-size: 0.7rem; color: $accent1; font-weight: bold; margin-bottom: 0.5rem; }
    h2 { margin: 0 0 1rem 0; font-size: 1.5rem; color: $secondary4; }
    p { color: $secondary1; line-height: 1.6; margin-bottom: 1.5rem; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }

    .post-footer {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: $secondary1;
      
      .views { display: flex; align-items: center; gap: 5px; }
    }
  }
}

.loader-container { display: flex; justify-content: center; min-height: 300px; }
.no-posts { text-align: center; padding: 4rem; color: $secondary1; }
</style>
