<template>
  <div class="blog-list-container">
    <div class="blog-list-page">
      <header class="page-header">
        <h1 class="page-title">{{ t("blog.title", "Blog") }}</h1>
        <div class="header-actions">
          <ClientOnly>
            <NuxtLink
              v-if="canCreate"
              :to="localePath('/blog/create')"
              class="create-post-btn"
            >
              <Icon name="material-symbols:add-circle-outline" />
              {{ t("blog.createPost", "Create Post") }}
            </NuxtLink>
          </ClientOnly>
          <div class="language-filter">
            <button
              v-for="l in ['en', 'es', 'ar']"
              :key="l"
              :class="{ active: selectedLangs.includes(l) }"
              @click="toggleLang(l)"
            >
              {{ l.toUpperCase() }}
            </button>
          </div>
        </div>
      </header>

      <div v-if="status === 'pending'" class="loader-container">
        <CustomLoader />
      </div>
      <div v-else-if="posts.length > 0" class="posts-grid">
        <NuxtLink
          v-for="post in posts"
          :key="post.id"
          :to="localePath('/blog/' + post.slug)"
          class="post-card"
        >
          <div class="post-content">
            <span class="post-lang">{{ post.language.toUpperCase() }}</span>
            <h2 class="post-card-title">{{ post.title }}</h2>
            <p class="post-summary">{{ post.summary || "..." }}</p>
            <div class="post-meta">
              <time class="post-date">{{
                formatDateSeparator(post.createdAt)
              }}</time>
              <span class="post-views"
                ><Icon name="material-symbols:visibility" />
                {{ post.viewCount }}</span
              >
            </div>
          </div>
        </NuxtLink>
      </div>
      <div v-else class="no-posts">
        <p>{{ t("blog.noPosts", "No posts found.") }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/useUserSocket";

const userStore = useUserStore();
const config = useRuntimeConfig();
const { t, locale } = useI18n();
const localePath = useLocalePath();
const { formatDateSeparator } = useDateFormatter();
const route = useRoute();
const router = useRouter();

// State
const posts = computed(() => data.value || []);

// Client-only toast initialization
const showToast = (type: "success" | "error", message: string) => {
  if (import.meta.client) {
    import("vue3-toastify").then(({ toast }) => {
      toast(message, {
        theme: "auto",
        type,
        position: "top-center",
        autoClose: 3000,
      });
    });
  }
};

// Sync selectedLang with query string ?lang=ar,es
const selectedLangs = computed({
  get: () => {
    const lang = route.query.lang;
    if (!lang) return [locale.value];
    return String(lang).split(",").filter(Boolean);
  },
  set: (val: string[]) => {
    router.push({
      query: { ...route.query, lang: val.join(",") || undefined }
    });
  }
});

const toggleLang = (l: string) => {
  const current = [...selectedLangs.value];
  const index = current.indexOf(l);
  if (index > -1) {
    if (current.length > 1) {
      current.splice(index, 1);
    }
  } else {
    current.push(l);
  }
  selectedLangs.value = current;
};

const canCreate = computed(() => {
  const role = userStore.getUserRole;
  return role === "admin" || role === "editor";
});

// Fetch logic
const fetchPosts = async () => {
  try {
    const headers: Record<string, string> = {
      "x-locale": locale.value,
    };

    if (import.meta.server) {
      const reqHeaders = useRequestHeaders(["cookie"]);
      Object.assign(headers, reqHeaders);
    }

    // CRITICAL: Internal fetch without absolute baseURL to prevent ECONNREFUSED in built app
    const response: any = await $fetch("/api/v1/blog", {
      query: { 
        lang: selectedLangs.value.join(","),
        publishedOnly: canCreate.value ? 'false' : 'true'
      },
      headers,
      baseURL: config.public.originUrl
    });

    if (response?.success) {
      return response.data;
    }
    return [];
  } catch (err: any) {
    console.error("[Blog Index] Fetch error:", err);
    if (import.meta.client) {
      showToast("error", t("errors.serverError", "Failed to load posts"));
    } else {
      throw err;
    }
    return [];
  }
};

const { status, data } = useAsyncData(
  `blog-list-${route.fullPath}`,
  () => fetchPosts(),
  {
    server: true,
    watch: [() => route.query.lang],
  }
);

</script>

<style lang="scss" scoped>
@use "sass:color";

.blog-list-container {
  flex: 1;
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
  border-bottom: 1px solid $lines;
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
  background: $accent1;
  color: $primary1;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: bold;
  font-size: 0.9rem;
  transition: background 0.2s;

  &:hover {
    background: color.adjust($accent1, $lightness: 10%);
  }
}

.page-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: $secondary4;
  margin: 0;
}

.language-filter {
  display: flex;
  gap: 0.5rem;
}

.language-filter button {
  background: $primary1;
  border: 1px solid $lines;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  color: $secondary1;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: $accent2;
    color: $primary1;
    border-color: $accent2;
    font-weight: bold;
  }
}

.posts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

.post-card {
  background: $primary3;
  border: 1px solid $lines;
  border-radius: 12px;
  padding: 1.5rem;
  text-decoration: none;
  transition:
    transform 0.2s,
    border-color 0.2s;

  &:hover {
    transform: translateY(-4px);
    border-color: $accent1;
  }
}

.post-lang {
  display: block;
  font-size: 0.75rem;
  color: $accent1;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.post-card-title {
  font-size: 1.5rem;
  color: $secondary4;
  margin: 0 0 0.75rem 0;
}

.post-summary {
  color: $secondary1;
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: $secondary1;
}

.loader-container {
  display: flex;
  justify-content: center;
  padding: 4rem;
}

.no-posts, .error-container {
  text-align: center;
  padding: 4rem;
  color: $secondary1;
}
</style>
