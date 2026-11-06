<template>
  <div ref="blogCreateContainer" class="blog-create-page" :class="[`mode-${mode}`, { 'sidebar-open': showSettingsSidebar }]">
    <!-- Enterprise CMS Header -->
    <header class="create-header">
      <div class="header-left">
        <button class="back-link" @click="goBack">
          <Icon name="material-symbols:arrow-back" />
          {{ t("blog.goBack", "Go Back") }}
        </button>

        <div class="post-title-meta">
          <h1>{{ isEdit ? "Edit Post" : "Create New Post" }}</h1>
          <span class="status-pill" :class="{ published: form.published }">
            {{ form.published ? "Published" : "Draft" }}
          </span>
          <span v-if="hasUnsavedChanges" class="unsaved-indicator" title="Unsaved changes">
            • Unsaved
          </span>
          <span v-else class="saved-indicator" title="All changes saved locally">
            • Saved
          </span>
        </div>
      </div>

      <!-- Center: View Mode Controls -->
      <div class="header-center">
        <div class="view-mode-tabs">
          <button
            type="button"
            :class="{ active: mode === 'edit' }"
            title="Editor view"
            @click="mode = 'edit'"
          >
            <Icon name="material-symbols:edit-note" /> Edit
          </button>
          <button
            type="button"
            :class="{ active: mode === 'split' }"
            title="Side-by-side live preview"
            @click="mode = 'split'"
          >
            <Icon name="material-symbols:vertical-split" /> Split
          </button>
          <button
            type="button"
            :class="{ active: mode === 'preview' }"
            title="Reader preview"
            @click="mode = 'preview'"
          >
            <Icon name="material-symbols:visibility" /> Preview
          </button>
        </div>
      </div>

      <!-- Right: Actions & Settings -->
      <div class="header-right">
        <div class="reading-stats" :title="`${wordCount} words`">
          <Icon name="material-symbols:schedule" /> {{ readingTime }} min read
        </div>

        <button
          type="button"
          class="settings-toggle-btn"
          :class="{ active: showSettingsSidebar }"
          title="Post Settings & SEO"
          @click="showSettingsSidebar = !showSettingsSidebar"
        >
          <Icon name="material-symbols:settings" />
          <span>Settings</span>
        </button>

        <div class="action-buttons">
          <button
            v-if="!form.published"
            type="button"
            class="draft-btn"
            :disabled="submitting"
            @click="savePost(false)"
          >
            {{ submitting ? "Saving..." : "Save Draft" }}
          </button>

          <button
            type="button"
            class="publish-btn"
            :disabled="submitting"
            @click="savePost(true)"
          >
            <Icon :name="form.published ? 'material-symbols:check-circle' : 'material-symbols:rocket-launch'" />
            {{ submitting ? "Saving..." : isEdit ? "Update Post" : "Publish" }}
          </button>
        </div>
      </div>
    </header>

    <!-- Restored Draft Alert Banner -->
    <div v-if="showDraftRestoreAlert" class="draft-restore-alert">
      <div class="alert-content">
        <Icon name="material-symbols:info-outline" />
        <span>You have an autosaved draft from <strong>{{ draftTimestamp }}</strong>. Would you like to restore it?</span>
      </div>
      <div class="alert-actions">
        <button class="restore-btn" @click="restoreLocalDraft">Restore Draft</button>
        <button class="dismiss-btn" @click="dismissLocalDraft">Discard</button>
      </div>
    </div>

    <!-- Main CMS Workspace -->
    <div class="cms-workspace">
      <!-- Left / Center: Editor and/or Preview -->
      <div class="editor-pane" :class="`view-${mode}`">
        <!-- Main Writing Form -->
        <div v-show="mode === 'edit' || mode === 'split'" class="editor-subpane">
          <!-- Title Input directly on page for frictionless authoring -->
          <div class="title-field-group">
            <input
              v-model="form.title"
              type="text"
              class="post-title-input"
              placeholder="Article Title..."
              dir="auto"
              @input="onTitleInput"
            />
          </div>

          <!-- Enterprise TipTap Rich Editor -->
          <div class="tiptap-container">
            <LazyTiptapEditor
              v-model="form.content"
              variant="enterprise"
              placeholder="Write your article... (type '/' for quick block insertion)"
              min-height="520px"
            />
          </div>
        </div>

        <!-- Live Split or Full Preview -->
        <div v-show="mode === 'split' || mode === 'preview'" class="preview-subpane">
          <div class="preview-subpane-inner">
            <div class="preview-watermark">Live Reader Preview</div>
            <PostPreview
              :title="form.title"
              :content="form.content"
              :summary="form.summary"
              :language="form.language"
              :published="form.published"
            />
          </div>
        </div>
      </div>

      <!-- Collapsible Metadata & SEO Sidebar -->
      <aside v-if="showSettingsSidebar" class="metadata-sidebar">
        <div class="sidebar-header">
          <h3><Icon name="material-symbols:tune" /> Post Settings</h3>
          <button class="close-sidebar-btn" @click="showSettingsSidebar = false">
            <Icon name="material-symbols:close" />
          </button>
        </div>

        <div class="sidebar-body">
          <!-- Slug Configuration -->
          <div class="sidebar-group">
            <div class="group-label-row">
              <label>URL Slug</label>
              <button
                type="button"
                class="slug-lock-toggle"
                :title="isSlugCustom ? 'Auto-generate from title' : 'Customize slug'"
                @click="toggleSlugLock"
              >
                <Icon :name="isSlugCustom ? 'material-symbols:lock' : 'material-symbols:lock-open'" />
                {{ isSlugCustom ? "Custom" : "Auto" }}
              </button>
            </div>
            <div class="slug-input-wrapper">
              <span class="slug-prefix">/blog/</span>
              <input
                v-model="form.slug"
                type="text"
                placeholder="url-slug-here"
                @input="isSlugCustom = true"
              />
            </div>
          </div>

          <!-- Language Selector -->
          <div class="sidebar-group">
            <label>Language</label>
            <select v-model="form.language">
              <option value="en">English (EN)</option>
              <option value="es">Español (ES)</option>
              <option value="ar">العربية (AR)</option>
            </select>
          </div>

          <!-- SEO Excerpt / Summary -->
          <div class="sidebar-group">
            <div class="group-label-row">
              <label>SEO Excerpt / Summary</label>
              <span class="char-count" :class="{ limit: (form.summary?.length || 0) > 450 }">
                {{ form.summary?.length || 0 }}/500
              </span>
            </div>
            <textarea
              v-model="form.summary"
              rows="3"
              maxlength="500"
              placeholder="Brief summary for search engines and social cards..."
            ></textarea>
          </div>

          <!-- Publication Status -->
          <div class="sidebar-group">
            <label class="publish-toggle-label">
              <input v-model="form.published" type="checkbox" />
              <span>Visible to Public (Published)</span>
            </label>
            <p class="sidebar-hint">
              Unpublished posts are saved as private drafts visible only to administrators.
            </p>
          </div>

          <!-- Real-Time Document Heading Outline -->
          <div class="sidebar-group outline-group">
            <label>
              <Icon name="material-symbols:format-list-numbered" /> Document Outline
            </label>
            <div v-if="documentHeadings.length > 0" class="outline-list">
              <div
                v-for="(h, idx) in documentHeadings"
                :key="idx"
                class="outline-item"
                :class="`level-${h.level}`"
              >
                <span class="h-badge">H{{ h.level }}</span>
                <span class="h-text" :title="h.text">{{ h.text }}</span>
              </div>
            </div>
            <div v-else class="empty-outline">
              No headings yet. Use H1, H2, or H3 in the editor to structure your post.
            </div>
          </div>
        </div>
      </aside>
    </div>

    <ScrollToTop :target="blogCreateContainer" />
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/useUserSocket";
import PostPreview from "~/components/blog/PostPreview.vue";
import { toast } from "vue3-toastify";
import { z } from "zod";
import { decodeSlug, encodeSlug, slugify } from "~/utils/slug";

const config = useRuntimeConfig();
const headers = useRequestHeaders(["cookie"]);

const blogCreateContainer = ref<HTMLElement | null>(null);
useMiddleClickScroll(blogCreateContainer);

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const { t } = useI18n();

const isEdit = computed(() => !!route.params.slug);
const mode = ref<"edit" | "split" | "preview">("edit");
const submitting = ref(false);
const noChangesDetected = ref(false);
const showSettingsSidebar = ref(true);
const isSlugCustom = ref(false);

const showDraftRestoreAlert = ref(false);
const draftTimestamp = ref("");
const LOCAL_STORAGE_KEY = computed(() =>
  isEdit.value ? `blog_draft_edit_${route.params.slug}` : "blog_draft_new"
);

const postSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(255),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(255)
    .refine((val) => /^[\p{L}\p{N}\p{M}\s_\-%+]+$/u.test(decodeSlug(val)), {
      message: "Slug must contain valid letters, numbers, hyphens, or underscores",
    }),
  content: z.string().min(1, "Content is required"),
  published: z.boolean().default(false),
  language: z.enum(["en", "es", "ar"]).default("en"),
  summary: z
    .string()
    .max(500, "Summary must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});

const form = reactive({
  title: "",
  slug: "",
  content: "",
  summary: "",
  language: "en",
  published: false,
});

const initialData = ref<string>("");
const cachedPost = useState<any>("active-blog-post");

// Statistics
const wordCount = computed(() => {
  if (!form.content) return 0;
  const stripped = form.content.replace(/<[^>]+>/g, " ").trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
});

const readingTime = computed(() => {
  return Math.max(1, Math.ceil(wordCount.value / 200));
});

// Real-Time Document Heading Outline Parser
const documentHeadings = computed(() => {
  if (!form.content) return [];
  const regex = /<h([1-3])[^>]*>(.*?)<\/h\1>/gi;
  const headings: { level: number; text: string }[] = [];
  let match;
  while ((match = regex.exec(form.content)) !== null) {
    const level = parseInt(match[1], 10);
    const rawText = match[2] || "";
    const text = rawText.replace(/<[^>]+>/g, "").trim();
    if (text) {
      headings.push({ level, text });
    }
  }
  return headings;
});

// Check if form changed compared to initial data
const hasUnsavedChanges = computed(() => {
  if (!initialData.value) return !!(form.title || form.content);
  return JSON.stringify(form) !== initialData.value;
});

// Load post data if editing
if (isEdit.value) {
  const decodedCurrentSlug = decodeSlug(route.params.slug);
  const encodedCurrentSlug = encodeSlug(decodedCurrentSlug);

  if (
    cachedPost.value &&
    (cachedPost.value.slug === decodedCurrentSlug ||
      decodeSlug(cachedPost.value.slug) === decodedCurrentSlug ||
      cachedPost.value.id === decodedCurrentSlug)
  ) {
    populateForm(cachedPost.value);
  } else {
    const { data: post } = await useFetch<any>(
      `/api/v1/blog/${encodedCurrentSlug}`,
      {
        baseURL: config.public.originUrl,
        headers,
      }
    );
    if (post.value?.data) {
      populateForm(post.value.data);
    }
  }
} else {
  initialData.value = JSON.stringify(form);
}

function populateForm(data: any) {
  form.title = data.title;
  form.slug = data.slug;
  form.content = data.content || "";
  form.summary = data.summary || "";
  form.language = data.language || "en";
  form.published = data.published || false;
  initialData.value = JSON.stringify(form);
  noChangesDetected.value = false;
  isSlugCustom.value = true;
}

// Autosave to LocalStorage
const saveDraftToLocalStorage = () => {
  if (import.meta.client && typeof window !== "undefined") {
    if (!form.title && !form.content) return;
    try {
      const payload = {
        data: { ...form },
        updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      localStorage.setItem(LOCAL_STORAGE_KEY.value, JSON.stringify(payload));
    } catch {}
  }
};

let autosaveTimer: any = null;
watch(
  form,
  () => {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      saveDraftToLocalStorage();
    }, 1000);
  },
  { deep: true }
);

// Check for existing local draft on mount
onMounted(() => {
  if (import.meta.client && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY.value);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data && (parsed.data.title || parsed.data.content)) {
          // Compare with current
          if (JSON.stringify(parsed.data) !== initialData.value) {
            draftTimestamp.value = parsed.updatedAt || "earlier";
            showDraftRestoreAlert.value = true;
          }
        }
      }
    } catch {}
  }

  // Keyboard shortcut Ctrl+S
  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      savePost(form.published);
    }
  };
  window.addEventListener("keydown", handleKeydown);
  onBeforeUnmount(() => window.removeEventListener("keydown", handleKeydown));
});

function restoreLocalDraft() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY.value);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(form, parsed.data);
      toast.success("Draft restored from local autosave!");
    }
  } catch {}
  showDraftRestoreAlert.value = false;
}

function dismissLocalDraft() {
  if (import.meta.client && typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_STORAGE_KEY.value);
  }
  showDraftRestoreAlert.value = false;
}

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    navigateTo(localePath("/blog"));
  }
}

function onTitleInput() {
  if (!isSlugCustom.value) {
    form.slug = slugify(form.title);
  }
}

function toggleSlugLock() {
  isSlugCustom.value = !isSlugCustom.value;
  if (!isSlugCustom.value) {
    form.slug = slugify(form.title);
  }
}

async function savePost(publishState?: boolean) {
  if (typeof publishState === "boolean") {
    form.published = publishState;
  }

  const validation = postSchema.safeParse(form);
  if (!validation.success) {
    toast.error(validation.error.issues[0].message);
    return;
  }

  let body: any = { ...form };
  const rawSlug = decodeSlug(form.slug);
  body.slug = slugify(rawSlug) || rawSlug;

  if (isEdit.value) {
    const currentData = JSON.stringify(form);
    if (currentData === initialData.value) {
      toast.info("No changes detected.");
      noChangesDetected.value = true;
      return;
    }

    const original = JSON.parse(initialData.value);
    const patches: any = {};
    let hasChanges = false;

    for (const key in form) {
      if (form[key as keyof typeof form] !== original[key]) {
        patches[key] = form[key as keyof typeof form];
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      toast.info("No changes detected.");
      noChangesDetected.value = true;
      return;
    }
    noChangesDetected.value = false;
    body = patches;
    if (body.slug) {
      const rawEditSlug = decodeSlug(body.slug);
      body.slug = slugify(rawEditSlug) || rawEditSlug;
    }
  }

  submitting.value = true;
  try {
    const decodedTarget = decodeSlug(route.params.slug);
    const url = isEdit.value
      ? `/api/v1/blog/${encodeSlug(decodedTarget)}`
      : "/api/v1/blog";
    const method = isEdit.value ? "PATCH" : "POST";

    const response = await $fetch<any>(url, {
      method,
      body,
      baseURL: config.public.originUrl,
      headers,
    });

    toast.success(
      `Post ${isEdit.value ? "updated" : "created"} successfully!`
    );

    // Clear local storage draft
    if (import.meta.client && typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_STORAGE_KEY.value);
    }

    if (response?.data) {
      cachedPost.value = response.data;
    }

    const finalSlug = decodeSlug(body.slug || form.slug);
    navigateTo(localePath(`/blog/${encodeSlug(finalSlug)}`));
  } catch (e: any) {
    toast.error(e.statusMessage || "Failed to save post.");
  } finally {
    submitting.value = false;
  }
}

// SEO
useSeoMeta({
  title: isEdit.value ? "Edit Post" : "Create Post",
  robots: "noindex, nofollow",
});
</script>

<style lang="scss" scoped>
.blog-create-page {
  @include mainMiddleSettings;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  /* Header */
  .create-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.5rem;
    background: $primary2;
    border-bottom: 1px solid $lines;
    flex-shrink: 0;
    gap: 1rem;

    .header-left {
      display: flex;
      align-items: center;
      gap: 1.25rem;

      .back-link {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        background: none;
        border: none;
        color: $secondary1;
        cursor: pointer;
        font-size: 0.85rem;
        padding: 0;

        &:hover {
          color: $accent1;
        }
      }

      .post-title-meta {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        h1 {
          font-size: 1.15rem;
          color: $secondary4;
          margin: 0;
          font-weight: 700;
        }

        .status-pill {
          font-size: 0.7rem;
          font-weight: bold;
          padding: 2px 8px;
          border-radius: 12px;
          background: rgba($secondary1, 0.2);
          color: $secondary1;
          text-transform: uppercase;

          &.published {
            background: rgba($accent2, 0.15);
            color: $accent2;
          }
        }

        .unsaved-indicator {
          font-size: 0.75rem;
          color: $accent1;
        }

        .saved-indicator {
          font-size: 0.75rem;
          color: $secondary1;
          opacity: 0.7;
        }
      }
    }

    .header-center {
      .view-mode-tabs {
        display: flex;
        background: $primary3;
        padding: 3px;
        border-radius: 8px;
        border: 1px solid $lines;

        button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border: none;
          background: transparent;
          color: $secondary1;
          cursor: pointer;
          border-radius: 6px;
          font-size: 0.82rem;
          transition: all 0.15s;

          &:hover {
            color: $secondary4;
          }

          &.active {
            background: $accent1;
            color: $primary1;
            font-weight: bold;
          }
        }
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;

      .reading-stats {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.8rem;
        color: $secondary1;
      }

      .settings-toggle-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        background: $primary3;
        border: 1px solid $lines;
        color: $secondary1;
        padding: 7px 12px;
        border-radius: 6px;
        font-size: 0.82rem;
        cursor: pointer;
        transition: all 0.15s;

        &:hover,
        &.active {
          border-color: $accent1;
          color: $accent1;
        }
      }

      .action-buttons {
        display: flex;
        align-items: center;
        gap: 8px;

        .draft-btn {
          background: transparent;
          border: 1px solid $lines;
          color: $secondary4;
          padding: 7px 14px;
          border-radius: 6px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s;

          &:hover:not(:disabled) {
            border-color: $secondary1;
            background: rgba(255, 255, 255, 0.05);
          }
        }

        .publish-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: $accent1;
          color: $primary1;
          border: none;
          padding: 7px 16px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s;

          &:hover:not(:disabled) {
            background: color-mix(in srgb, $accent1 85%, white);
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
      }
    }
  }

  /* Draft alert */
  .draft-restore-alert {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba($accent2, 0.12);
    border-bottom: 1px solid rgba($accent2, 0.3);
    padding: 8px 1.5rem;
    font-size: 0.85rem;
    color: $secondary4;

    .alert-content {
      display: flex;
      align-items: center;
      gap: 8px;
      color: $accent2;

      span {
        color: $secondary4;
      }
    }

    .alert-actions {
      display: flex;
      gap: 8px;

      .restore-btn {
        background: $accent2;
        color: $primary1;
        border: none;
        padding: 4px 12px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 0.78rem;
        cursor: pointer;
      }

      .dismiss-btn {
        background: transparent;
        border: 1px solid $lines;
        color: $secondary1;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 0.78rem;
        cursor: pointer;
      }
    }
  }

  /* Main CMS Workspace */
  .cms-workspace {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;

    .editor-pane {
      flex: 1;
      display: flex;
      overflow-y: auto;
      scroll-behavior: smooth;

      &.view-edit {
        .editor-subpane {
          flex: 1;
          max-width: 900px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem;
        }
      }

      &.view-split {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0;

        .editor-subpane {
          padding: 2rem 1.5rem;
          border-right: 1px solid $lines;
          overflow-y: auto;
        }

        .preview-subpane {
          padding: 2rem 1.5rem;
          overflow-y: auto;
        }
      }

      &.view-preview {
        .preview-subpane {
          flex: 1;
          max-width: 960px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem;
        }
      }

      .editor-subpane {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;

        .title-field-group {
          .post-title-input {
            width: 100%;
            background: transparent;
            border: none;
            border-bottom: 1px solid transparent;
            font-size: 2.2rem;
            font-weight: 800;
            color: $secondary4;
            padding: 8px 0;
            outline: none;
            transition: border-color 0.2s;

            &::placeholder {
              color: $secondary1;
              opacity: 0.4;
            }

            &:focus {
              border-bottom-color: $accent1;
            }
          }
        }
      }

      .preview-subpane {
        .preview-subpane-inner {
          position: relative;

          .preview-watermark {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: $accent1;
            font-weight: bold;
            margin-bottom: 1rem;
            opacity: 0.8;
          }
        }
      }
    }

    /* Metadata Sidebar */
    .metadata-sidebar {
      width: 320px;
      background: $primary2;
      border-left: 1px solid $lines;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      overflow-y: auto;

      .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid $lines;

        h3 {
          margin: 0;
          font-size: 0.95rem;
          color: $secondary4;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .close-sidebar-btn {
          background: transparent;
          border: none;
          color: $secondary1;
          cursor: pointer;
          padding: 0;
          font-size: 1.1rem;

          &:hover {
            color: $accent1;
          }
        }
      }

      .sidebar-body {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;

        .sidebar-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;

          label {
            font-size: 0.82rem;
            font-weight: bold;
            color: $secondary1;
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .group-label-row {
            display: flex;
            justify-content: space-between;
            align-items: center;

            .slug-lock-toggle {
              background: transparent;
              border: none;
              color: $accent1;
              font-size: 0.75rem;
              display: flex;
              align-items: center;
              gap: 3px;
              cursor: pointer;

              &:hover {
                text-decoration: underline;
              }
            }

            .char-count {
              font-size: 0.75rem;
              color: $secondary1;

              &.limit {
                color: #f87171;
              }
            }
          }

          .slug-input-wrapper {
            display: flex;
            align-items: center;
            background: $primary3;
            border: 1px solid $lines;
            border-radius: 6px;
            padding: 0 10px;

            .slug-prefix {
              color: $secondary1;
              font-size: 0.85rem;
              font-family: $main-font;
            }

            input {
              flex: 1;
              background: transparent;
              border: none;
              padding: 8px 4px;
              color: $secondary4;
              font-size: 0.85rem;
              font-family: $main-font;

              &:focus {
                outline: none;
              }
            }
          }

          select,
          textarea {
            background: $primary3;
            border: 1px solid $lines;
            color: $secondary4;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.85rem;

            &:focus {
              outline: none;
              border-color: $accent1;
            }
          }

          .publish-toggle-label {
            display: flex;
            align-items: center;
            gap: 8px;
            color: $secondary4;
            cursor: pointer;

            input[type="checkbox"] {
              accent-color: $accent1;
              width: 16px;
              height: 16px;
            }
          }

          .sidebar-hint {
            font-size: 0.75rem;
            color: $secondary1;
            line-height: 1.4;
            margin: 0;
          }

          &.outline-group {
            border-top: 1px solid $lines;
            padding-top: 1.25rem;

            .outline-list {
              display: flex;
              flex-direction: column;
              gap: 4px;
              max-height: 220px;
              overflow-y: auto;

              .outline-item {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 0.8rem;
                padding: 4px 6px;
                border-radius: 4px;

                &.level-1 {
                  color: $gradients2;
                  font-weight: bold;
                }

                &.level-2 {
                  padding-left: 14px;
                  color: $accent1;
                }

                &.level-3 {
                  padding-left: 24px;
                  color: $secondary1;
                }

                .h-badge {
                  font-size: 0.68rem;
                  opacity: 0.6;
                  font-family: $main-font;
                }

                .h-text {
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
              }
            }

            .empty-outline {
              font-size: 0.78rem;
              color: $secondary1;
              line-height: 1.4;
              font-style: italic;
            }
          }
        }
      }
    }
  }

  @include mobile {
    .create-header {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
      padding: 0.75rem;

      .header-center {
        display: flex;
        justify-content: center;
      }

      .header-right {
        justify-content: space-between;
      }
    }

    .cms-workspace {
      .editor-pane.view-split {
        grid-template-columns: 1fr;
      }

      .metadata-sidebar {
        position: absolute;
        top: 0;
        right: 0;
        height: 100%;
        z-index: 50;
        box-shadow: -8px 0 24px rgba(0, 0, 0, 0.6);
      }
    }
  }
}
</style>