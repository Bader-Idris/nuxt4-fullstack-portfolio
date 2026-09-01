<template>
  <div ref="blogPostContainer" class="blog-post-page" dir="auto">
    <div v-if="status === 'pending' && !postData" class="loader-container">
      <CustomLoader />
    </div>
    <div v-else-if="error || (!postData && status !== 'pending')" class="error-container">
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
            <div v-if="postData.isAuthor || isAdmin" class="author-actions">
              <button class="edit-btn" @click="editPost">
                <Icon name="material-symbols:edit" /> Edit Post
              </button>
              <button class="delete-btn" @click="deletePost">
                <Icon name="material-symbols:delete" /> Delete Post
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
import { decodeSlug, encodeSlug } from "~/utils/slug";

const blogPostContainer = ref<HTMLElement | null>(null);
useMiddleClickScroll(blogPostContainer);

const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const { t, locale, locales } = useI18n();
const config = useRuntimeConfig();
const userStore = useUserStore();

// Fully decodes multilingual, Arabic, and space-enriched slugs
const slug = computed(() => {
  return decodeSlug(route.params.slug);
});

// Client-side address bar clean decode for percent-encoded clicks from sitemaps/bookmarks
const cleanAddressBarUrl = () => {
  if (import.meta.client && typeof window !== "undefined") {
    const currentPath = window.location.pathname;
    if (currentPath.includes("%")) {
      try {
        let decodedPath = currentPath;
        for (let i = 0; i < 3; i++) {
          try {
            const d = decodeURI(decodedPath);
            if (d === decodedPath) break;
            decodedPath = d;
          } catch {
            break;
          }
        }
        if (decodedPath !== currentPath) {
          window.history.replaceState(
            window.history.state,
            "",
            decodedPath + window.location.search + window.location.hash
          );
        }
      } catch {}
    }
  }
};

onMounted(() => {
  cleanAddressBarUrl();
});

watch(
  () => route.fullPath,
  () => {
    cleanAddressBarUrl();
  }
);

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

    let baseURL = config.public.originUrl;
    if (import.meta.server) {
      const reqHeaders = useRequestHeaders(["cookie"]);
      Object.assign(headers, reqHeaders);
      try {
        const reqUrl = useRequestURL();
        if (reqUrl?.origin) {
          baseURL = reqUrl.origin;
        }
      } catch {}
    }

    // Direct fetch with safe encoded slug and origin-aware baseURL for SSR/SSG
    const encodedTarget = encodeSlug(slug.value);
    const response: any = await $fetch(`/api/v1/blog/${encodedTarget}`, {
      headers,
      baseURL,
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

const { status, data, error, refresh } = await useAsyncData(
  `blog-post-${slug.value}`,
  () => fetchPost()
);

// SSR & SEO: If post not found during server render, throw clean 404 for search bots & browsers
if (import.meta.server && (!data.value || error.value)) {
  const statusCode = (error.value as any)?.statusCode || 404;
  throw createError({
    statusCode,
    statusMessage: t("blog.notFound", "Post Not Found"),
    fatal: true,
  });
}

const postData = computed(() => data.value);

// Update cached post for edit page
const cachedPost = useState<any>("active-blog-post");
watch(
  postData,
  (newVal) => {
    if (newVal) {
      cachedPost.value = newVal;
    }
  },
  { immediate: true }
);

const { formatDateSeparator } = useDateFormatter();
function formatDate(date: string) {
  return formatDateSeparator(date);
}

function editPost() {
  navigateTo(localePath(`/blog/edit/${encodeSlug(slug.value)}`));
}

async function deletePost() {
  if (!confirm(t("blog.confirmDelete", "Are you sure you want to delete this post?"))) {
    return;
  }
  try {
    const res: any = await $fetch(`/api/v1/blog/${encodeSlug(slug.value)}`, {
      method: "DELETE",
    });
    if (res?.success) {
      showToast("success", t("blog.deleteSuccess", "Post deleted successfully"));
      router.push(localePath("/blog"));
    }
  } catch (err: any) {
    showToast("error", err.statusMessage || t("errors.serverError", "Failed to delete post"));
  }
}

// Canonical & Multilingual SEO URL calculation
const siteBaseUrl = computed(() => {
  const raw = config.public.siteUrl || config.public.originUrl || "https://baderidris.com";
  return String(raw).replace(/\/$/, "");
});

const currentLocalePath = computed(() => localePath(`/blog/${slug.value}`));
const canonicalUrl = computed(() => `${siteBaseUrl.value}${currentLocalePath.value}`);

// Dynamic SEO tags
const seoTitle = computed(() => postData.value?.title || t("blog.title"));
const seoDesc = computed(() => postData.value?.summary || t("blog.description"));

useSeoMeta({
  title: seoTitle.value,
  ogTitle: seoTitle.value,
  description: seoDesc.value,
  ogDescription: seoDesc.value,
  ogType: "article",
  ogUrl: canonicalUrl.value,
  twitterTitle: seoTitle.value,
  twitterDescription: seoDesc.value,
  twitterCard: "summary_large_image",
  articlePublishedTime: () => postData.value?.createdAt,
  articleModifiedTime: () => postData.value?.updatedAt,
  articleAuthor: () => [postData.value?.author?.name || "Bader Idris"],
});

// Canonical & alternate hreflangs
useHead(() => {
  const links: any[] = [
    { rel: "canonical", href: canonicalUrl.value },
  ];

  // Generate alternate hreflang links for multilingual search engines
  const supportedLocales = ["en", "ar", "es"];
  for (const code of supportedLocales) {
    const localizedPath = localePath(`/blog/${slug.value}`, code);
    links.push({
      rel: "alternate",
      hreflang: code,
      href: `${siteBaseUrl.value}${localizedPath}`,
    });
  }
  // Default hreflang fallback
  links.push({
    rel: "alternate",
    hreflang: "x-default",
    href: `${siteBaseUrl.value}${localePath(`/blog/${slug.value}`, "en")}`,
  });

  return { link: links };
});

defineOgImage("Default.takumi", {
  title: seoTitle.value,
  description: seoDesc.value,
  slug: slug.value,
  language: postData.value?.language || locale.value,
  author: postData.value?.author?.name || "Bader Idris",
  views: postData.value?.viewCount || 0,
  comments: postData.value?.commentCount || 0,
});

// Schema.org Structured Data for Google Rich Results
if (import.meta.server) {
  useSchemaOrg([
    defineArticle({
      headline: () => postData.value?.title,
      description: () => postData.value?.summary,
      datePublished: () => postData.value?.createdAt,
      dateModified: () => postData.value?.updatedAt || postData.value?.createdAt,
      inLanguage: () => postData.value?.language || locale.value,
      author: [{ name: postData.value?.author?.name || "Bader Idris" }],
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
  flex: 1;
  overflow-y: auto !important;
  padding: 2rem;

  @include mobile {
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
    top: 0;
    right: 0;
    background: #ff5722;
    color: white;
    padding: 4px 8px;
    font-size: 0.75rem;
    font-weight: bold;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .post-title {
    font-size: 2.2rem;
    color: $accent1;
    margin-bottom: 1rem;
    line-height: 1.3;
    font-weight: 700;
  }

  .post-meta {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    color: $secondary1;
    font-size: 0.85rem;
    flex-wrap: wrap;

    .views {
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .language-badge {
      background: $primary3;
      border: 1px solid $lines;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
  }
}

.post-footer {
  margin-top: 3rem;
  border-top: 1px solid $lines;
  padding-top: 2rem;

  .post-summary {
    background: rgba($primary3, 0.4);
    border-left: 3px solid $accent1;
    padding: 1rem;
    border-radius: 0 6px 6px 0;
    margin-bottom: 2rem;

    h3 {
      font-size: 1rem;
      color: $secondary4;
      margin-bottom: 0.5rem;
    }

    p {
      color: $secondary1;
      font-size: 0.9rem;
      line-height: 1.5;
    }
  }

  .post-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;

    .author-actions {
      display: flex;
      gap: 0.75rem;

      button {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 0.85rem;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;

        &.edit-btn {
          background: rgba($accent1, 0.1);
          color: $accent1;
          border: 1px solid rgba($accent1, 0.3);

          &:hover {
            background: $accent1;
            color: $primary1;
          }
        }

        &.delete-btn {
          background: rgba(#f44336, 0.1);
          color: #f44336;
          border: 1px solid rgba(#f44336, 0.3);

          &:hover {
            background: #f44336;
            color: white;
          }
        }
      }
    }
  }
}

.comments-section {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid $lines;

  h3 {
    font-size: 1.3rem;
    color: $secondary4;
    margin-bottom: 1.5rem;
  }
}

.loader-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: 1rem;

  h1 {
    color: $accent1;
    font-size: 1.8rem;
  }

  a {
    color: $secondary1;
    text-decoration: underline;

    &:hover {
      color: $accent1;
    }
  }
}
</style>
