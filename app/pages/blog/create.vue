<template>
  <div ref="blogCreateContainer" class="blog-create-page">
    <header class="create-header">
      <div class="header-left">
        <button class="back-link" @click="goBack">
          <Icon name="material-symbols:arrow-back" /> {{ t('blog.goBack', 'Go Back') }}
        </button>
        <h1>{{ isEdit ? 'Edit Post' : 'Create New Post' }}</h1>
      </div>
      <div class="mode-toggle">
        <button :class="{ active: mode === 'edit' }" @click="mode = 'edit'">Edit</button>
        <button :class="{ active: mode === 'preview' }" @click="mode = 'preview'">Review</button>
      </div>
    </header>

    <div v-show="mode === 'edit'" class="edit-container">
      <div class="form-group">
        <label>Title</label>
        <input v-model="form.title" type="text" placeholder="Enter post title..." dir="auto" @input="generateSlug" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Slug</label>
          <input v-model="form.slug" type="text" placeholder="url-slug-here" />
        </div>
        <div class="form-group">
          <label>Language</label>
          <select v-model="form.language">
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="ar">العربية</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Summary (for SEO)</label>
        <textarea v-model="form.summary" rows="2" placeholder="Brief overview..."></textarea>
      </div>

      <div class="form-group">
        <label>Content</label>
        <LazyTiptapEditor v-model="form.content" placeholder="Write your masterpiece..." />
      </div>

      <div class="form-actions">
        <div class="actions-left">
          <label class="publish-checkbox">
            <input type="checkbox" v-model="form.published" />
            Publish immediately
          </label>
          <button v-if="noChangesDetected" class="secondary-back-btn" @click="goBack">
            <Icon name="material-symbols:arrow-back" /> {{ t('blog.goBack', 'Go Back') }}
          </button>
        </div>
        <button class="save-btn" :disabled="submitting" @click="savePost">
          {{ submitting ? 'Saving...' : (isEdit ? 'Update Post' : 'Create Post') }}
        </button>
      </div>
    </div>

    <div v-show="mode === 'preview'" class="preview-container">
      <PostPreview 
        :title="form.title" 
        :content="form.content" 
        :summary="form.summary" 
        :language="form.language"
        :published="form.published"
      />
    </div>
      <ScrollToTop :target="blogCreateContainer" />
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/useUserSocket";
import PostPreview from "~/components/blog/PostPreview.vue";
import { toast } from "vue3-toastify";

const blogCreateContainer = ref<HTMLElement | null>(null);
useMiddleClickScroll(blogCreateContainer);

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const { t } = useI18n();

const isEdit = computed(() => !!route.params.slug);
const mode = ref<'edit' | 'preview'>('edit');
const submitting = ref(false);
const noChangesDetected = ref(false);

const form = reactive({
  title: '',
  slug: '',
  content: '',
  summary: '',
  language: 'en',
  published: false
});

const initialData = ref<string>('');
const cachedPost = useState<any>('active-blog-post');

// Load post data if editing
if (isEdit.value) {
  const currentSlug = Array.isArray(route.params.slug) ? route.params.slug.join('/') : route.params.slug;
  // Try to use cached data first to avoid redundant DB hits
  if (cachedPost.value && (cachedPost.value.slug === currentSlug || cachedPost.value.id === currentSlug)) {
    populateForm(cachedPost.value);
  } else {
    const { data: post } = await useFetch<any>(`/api/v1/blog/${currentSlug}`);
    if (post.value?.data) {
      populateForm(post.value.data);
    }
  }
}

function populateForm(data: any) {
  form.title = data.title;
  form.slug = data.slug;
  form.content = data.content;
  form.summary = data.summary || '';
  form.language = data.language;
  form.published = data.published;
  initialData.value = JSON.stringify(form);
  noChangesDetected.value = false;
}

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    navigateTo(localePath('/blog'));
  }
}

function generateSlug() {
  if (isEdit.value) return;
  // Support for Arabic and other Unicode characters in slugs
  form.slug = form.title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function savePost() {
  if (!form.title || !form.slug || !form.content) {
    toast.error("Please fill in all required fields.");
    return;
  }

  let body: any = { ...form };
  
  if (isEdit.value) {
    const currentData = JSON.stringify(form);
    if (currentData === initialData.value) {
      toast.info("No changes detected.");
      noChangesDetected.value = true;
      return;
    }
    
    // Patching: only send changed fields
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
  }

  submitting.value = true;
  try {
    const url = isEdit.value ? `/api/v1/blog/${route.params.slug}` : '/api/v1/blog';
    const method = isEdit.value ? 'PATCH' : 'POST';

    const response = await $fetch<any>(url, {
      method,
      body
    });

    toast.success(`Post ${isEdit.value ? 'updated' : 'created'} successfully!`);
    
    // Update cached data to reflect changes immediately
    if (response?.data) {
      cachedPost.value = response.data;
    }

    navigateTo(localePath(`/blog/${form.slug}`));
  } catch (e: any) {
    toast.error(e.statusMessage || "Failed to save post.");
  } finally {
    submitting.value = false;
  }
}

// SEO
useSeoMeta({
  title: isEdit.value ? 'Edit Post' : 'Create Post',
  robots: 'noindex, nofollow'
});
</script>

<style lang="scss" scoped>
.blog-create-page {
   @include mainMiddleSettings;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 2rem;

  .create-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3rem;

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

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
        width: fit-content;
        &:hover { color: $accent1; }
      }
    }

    h1 { color: $gradients1; margin: 0; }
    
    .mode-toggle {
      display: flex;
      background: $primary3;
      padding: 4px;
      border-radius: 8px;
      button {
        padding: 6px 16px;
        border: none;
        background: none;
        color: $secondary1;
        cursor: pointer;
        border-radius: 6px;
        &.active { background: $accent1; color: white; }
      }
    }
  }

  .edit-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    label { color: $secondary1; font-weight: bold; font-size: 0.9rem; }
    input, select, textarea {
      background: $primary3;
      border: 1px solid $lines;
      padding: 12px;
      border-radius: 8px;
      color: $secondary4;
      &:focus { outline: none; border-color: $accent1; }
    }
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 200px;
    gap: 1rem;
    @include mobile { grid-template-columns: 1fr; }
  }

  .form-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid $lines;

    .actions-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .secondary-back-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: $primary3;
      border: 1px solid $lines;
      color: $secondary1;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      &:hover { border-color: $accent1; color: $accent1; }
    }

    .publish-checkbox {
      display: flex;
      align-items: center;
      gap: 10px;
      color: $secondary1;
      cursor: pointer;
    }

    .save-btn {
      background: $accent1;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
  }
}
</style>
