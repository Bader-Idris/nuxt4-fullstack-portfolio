<template>
  <div ref="blogCreateContainer" class="blog-create-page">
    <header class="create-header">
      <h1>{{ isEdit ? 'Edit Post' : 'Create New Post' }}</h1>
      <div class="mode-toggle">
        <button :class="{ active: mode === 'edit' }" @click="mode = 'edit'">Edit</button>
        <button :class="{ active: mode === 'preview' }" @click="mode = 'preview'">Review</button>
      </div>
    </header>

    <div v-show="mode === 'edit'" class="edit-container">
      <div class="form-group">
        <label>Title</label>
        <input v-model="form.title" type="text" placeholder="Enter post title..." @input="generateSlug" />
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
        <TiptapEditor v-model="form.content" placeholder="Write your masterpiece..." />
      </div>

      <div class="form-actions">
        <label class="publish-checkbox">
          <input type="checkbox" v-model="form.published" />
          Publish immediately
        </label>
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
const localePath = useLocalePath();

const isEdit = computed(() => !!route.params.slug);
const mode = ref<'edit' | 'preview'>('edit');
const submitting = ref(false);

const form = reactive({
  title: '',
  slug: '',
  content: '',
  summary: '',
  language: 'en',
  published: false
});

// Load post data if editing
if (isEdit.value) {
  const { data: post } = await useFetch<any>(`/api/v1/blog/${route.params.slug}`);
  if (post.value?.data) {
    Object.assign(form, post.value.data);
  }
}

function generateSlug() {
  if (isEdit.value) return;
  form.slug = form.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

async function savePost() {
  if (!form.title || !form.slug || !form.content) {
    toast.error("Please fill in all required fields.");
    return;
  }

  submitting.value = true;
  try {
    const url = isEdit.value ? `/api/v1/blog/${route.params.slug}` : '/api/v1/blog';
    const method = isEdit.value ? 'PATCH' : 'POST';

    await $fetch(url, {
      method,
      body: form
    });

    toast.success(`Post ${isEdit.value ? 'updated' : 'created'} successfully!`);
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
