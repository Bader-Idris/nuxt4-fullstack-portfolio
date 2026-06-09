<template>
  <div ref="blogPostContainer" class="blog-post-page" dir="auto">
    <div v-if="status === 'pending' && !postData" class="loader-container">
      <CustomLoader />
    </div>
    <div v-else-if="error || (!status === 'pending' && !postData)" class="error-container">
      <h1>{{ t("blog.notFound", "Post Not Found") }}</h1>
      <NuxtLink :to="localePath('/blog')">{{
        t("blog.backToBlog", "Back to Blog")
      }}</NuxtLink>
    </div>
    <article v-else-if="postData" class="post-article">
      <header class="post-header">
        <NuxtLink :to="localePath('/blog')" class="back-link">
          <Icon name="material-symbols:arrow-back" />
          {{ t("blog.goBack", "Go Back") }}
        </NuxtLink>
        <div v-if="!postData.published" class="unpublished-badge">Draft</div>
        <h1 class="post-title" dir="auto">{{ postData.title }}</h1>
        <div class="post-meta">
          <time :datetime="postData.createdAt">{{
            formatDate(postData.createdAt)
          }}</time>
          <span class="author">By {{ postData.author.name }}</span>
          <span class="views"
            ><Icon name="material-symbols:visibility" />
            {{ postData.viewCount }}</span
          >
          <span class="language-badge">{{
            postData.language.toUpperCase()
          }}</span>
        </div>
      </header>

      <BlogContent :content="postData.content" />

      <footer class="post-footer">
        <div v-if="postData.summary" class="post-summary">
          <h3>Summary</h3>
          <p>{{ postData.summary }}</p>
        </div>

        <div class="post-actions">
          <NuxtLink :to="localePath('/blog')" class="back-to-blog-btn">
            <Icon name="material-symbols:grid-view-outline" />
            {{ t("blog.backToBlog", "Back to Blog") }}
          </NuxtLink>
          <ClientOnly>
            <div v-if="postData.isAuthor || isAdmin">
              <button class="edit-btn" @click="editPost">
                <Icon name="material-symbols:edit" /> Edit Post
              </button>
            </div>
          </ClientOnly>
        </div>
      </footer>

      <!-- Comment Section -->
      <section class="comments-section">
        <h3>Comments ({{ postData.commentCount }})</h3>
        <BlogCommentSection :post-slug="slug" @comment-added="refresh" />
      </section>
    </article>
    <ScrollToTop :target="blogPostContainer" />
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/useUserSocket";
import { useDateFormatter } from "~/composables/useDateFormatter";

const blogPostContainer = ref<HTMLElement | null>(null);
useMiddleClickScroll(blogPostContainer);

const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const { t, locale } = useI18n();
const config = useRuntimeConfig();
const userStore = useUserStore();

const slug = computed(() => {
  const s = route.params.slug;
  return Array.isArray(s) ? s.join("/") : s;
});

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

const isAdmin = computed(() => userStore.getUserRole === "admin");

// Fetch logic encapsulating auth and error handling
const fetchPost = async () => {
  try {
    const headers: Record<string, string> = {
      "x-locale": locale.value,
    };

    if (import.meta.server) {
      const reqHeaders = useRequestHeaders(["cookie"]);
      Object.assign(headers, reqHeaders);
    }

    const response: any = await $fetch(`/api/v1/blog/${slug.value}`, {
      baseURL: config.public.originUrl,
      headers,
    });

    if (response?.success) {
      return response.data;
    }
    return null;
  } catch (err: any) {
    const status = err.statusCode || 500;
    
    // Auth check for unpublished posts
    if (status === 403 || status === 401) {
      if (import.meta.client) {
        showToast("error", t("errors.adminAccessRequired", "Access denied"));
        router.push({
          path: localePath("/login"),
          query: { redirect: route.fullPath },
        });
      } else {
        throw err;
      }
      return null;
    }

    console.error(`[Blog Detail] Fetch error for ${slug.value}:`, err);
    if (import.meta.server && status !== 404) {
      throw err;
    }
    return null;
  }
};

const { status, data, error, refresh } = useAsyncData(
  `blog-post-${slug.value}-${locale.value}`,
  () => fetchPost(),
  {
    server: true,
  }
);

// AI & SEO: Throw a proper 404 error if the post is not found.
// This ensures that the server returns a 404 status code, which is critical
// for AI crawlers (like GPTBot) and search engines to avoid indexing dead links.
watchEffect(() => {
  if (status.value !== "pending" && (!data.value || error.value)) {
    const statusCode = (error.value as any)?.statusCode || 404;
    showError({
      statusCode,
      statusMessage: t("blog.notFound", "Post Not Found"),
      fatal: true,
    });
  }
});

const postData = computed(() => data.value);

const { formatDateSeparator } = useDateFormatter();
function formatDate(date: string) {
  return formatDateSeparator(date);
}

function editPost() {
  navigateTo(localePath(`/blog/edit/${slug.value}`));
}

// Pre-calculate path to avoid calling useLocalePath inside getters
const fullPathWithLocale = computed(() => localePath(route.fullPath));

// Dynamic SEO
useSeoMeta({
  title: () => postData.value?.title || t("blog.loading", "Loading..."),
  description: () => postData.value?.summary,
  // originUrl can be "./" in Electron, so we use siteUrl for absolute SEO URLs
  ogImage: () => `${config.public.siteUrl}/_og/r/blog/${slug.value}.png`,
  ogUrl: () => `${config.public.siteUrl}${fullPathWithLocale.value}`,
});

if (import.meta.server) {
  defineOgImage("Default", {
    title: computed(() => postData.value?.title || "Blog Post"),
    description: computed(
      () => postData.value?.summary || "Read more on Bader Idris's blog.",
    ),
  });
}

// Schema.org
if (import.meta.server) {
  useSchemaOrg([
    defineArticle({
      headline: () => postData.value?.title,
      description: () => postData.value?.summary,
      datePublished: () => postData.value?.createdAt,
      author: [{ name: postData.value?.author.name || "Bader Idris" }],
    }),
  ]);
}
</script>

<style lang="scss" scoped>
.back-link {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: $secondary1;
  text-decoration: none;
  font-size: 0.85rem;
  margin-bottom: 1rem;
  width: fit-content;
  &:hover {
    color: $accent1;
  }
}

.back-to-blog-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: $primary3;
  border: 1px solid $lines;
  color: $secondary1;
  padding: 8px 16px;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.85rem;
  &:hover {
    border-color: $accent1;
    color: $accent1;
  }
}

.blog-post-page {
  overflow: auto !important;
  padding: 2rem;
  @include mainMiddleSettings;

  @include mobile {
    overflow-y: scroll !important;
    padding: 1rem;
    @include phone-borders;
  }
}

.post-header {
  margin-bottom: 3rem;
  border-bottom: 1px solid $lines;
  padding-bottom: 1.5rem;
  position: relative;

  .unpublished-badge {
    position: absolute;
    top: 0;
    right: 0;
    background: $accent2;
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: bold;
    text-transform: uppercase;
  }

  .post-title {
    font-size: 2.2rem;
    color: $secondary4;
    margin-bottom: 1rem;
    line-height: 1.2;
    font-weight: 600;
    @include mobile {
      font-size: 1.8rem;
    }
  }

  .post-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    color: $secondary1;
    font-size: 0.9rem;

    .views {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .language-badge {
      background: $primary3;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: bold;
      border: 1px solid $lines;
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
    h3 {
      margin-top: 0;
      color: $secondary1;
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    p {
      margin-bottom: 0;
      font-style: italic;
    }
  }

  .post-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;

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
      &:hover {
        opacity: 0.8;
      }
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

.loader-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}
</style>
