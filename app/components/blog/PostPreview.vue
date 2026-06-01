<template>
  <div class="post-preview">
    <div class="preview-header">
      <h1 class="post-title">{{ title || 'Untitled Post' }}</h1>
      <div class="post-meta">
        <span class="lang-badge">{{ language.toUpperCase() }}</span>
        <span class="status-badge" :class="{ published }">{{ published ? 'Published' : 'Draft' }}</span>
      </div>
    </div>
    
    <div v-if="summary" class="post-summary-box">
      <strong>Summary:</strong>
      <p>{{ summary }}</p>
    </div>

    <div class="preview-content">
      <BlogContent :content="content" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  content: string;
  summary: string;
  language: string;
  published: boolean;
}>();
</script>

<style lang="scss" scoped>
.post-preview {
  background: $primary3;
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid $lines;
  
  .preview-header {
    margin-bottom: 2rem;
    border-bottom: 1px solid $lines;
    padding-bottom: 1rem;
    
    .post-title {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      color: $gradients1;
    }
    
    .post-meta {
      display: flex;
      gap: 10px;
      .lang-badge, .status-badge {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: bold;
      }
      .lang-badge { background: $secondary2; color: white; }
      .status-badge { 
        background: $secondary1; color: white;
        &.published { background: #4caf50; }
      }
    }
  }

  .post-summary-box {
    background: rgba($secondary1, 0.1);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    border-left: 4px solid $accent2;
    p { margin-top: 0.5rem; font-style: italic; }
  }

  .preview-content {
    min-height: 200px;
  }
}
</style>
