<template>
  <div class="comment-section">
    <!-- Add Comment Form -->
    <div v-if="userStore.isAuthenticated" class="add-comment-form">
      <textarea 
        v-model="newComment" 
        :placeholder="t('blog.addComment', 'Add a public comment...')" 
        rows="3"
      ></textarea>
      <button @click="submitComment" :disabled="submitting || !newComment.trim()">
        <span v-if="submitting" class="spinner"></span>
        {{ t('blog.postComment', 'Post Comment') }}
      </button>
    </div>
    <div v-else class="login-prompt">
      <p>{{ t('blog.loginToComment', 'Please login to leave a comment.') }} <NuxtLink :to="localePath('/login')">{{ t('auth.login', 'Login') }}</NuxtLink></p>
    </div>

    <!-- Comments List -->
    <div v-if="pending" class="comments-loader">
      <CustomLoader />
    </div>
    <div v-else-if="comments && comments.length > 0" class="comments-list">
      <div v-for="comment in comments" :key="comment.id" class="comment-item">
        <div class="comment-header">
          <span class="author-name">{{ comment.author.name }}</span>
          <time :datetime="comment.createdAt">{{ formatRelativeTime(comment.createdAt) }}</time>
        </div>
        <div class="comment-content">
          {{ comment.content }}
        </div>
        <div class="comment-actions">
          <button @click="replyTo(comment.id)">Reply</button>
        </div>

        <!-- Replies -->
        <div v-if="comment.replies && comment.replies.length > 0" class="replies-list">
          <div v-for="reply in comment.replies" :key="reply.id" class="comment-item reply-item">
            <div class="comment-header">
              <span class="author-name">{{ reply.author.name }}</span>
              <time :datetime="reply.createdAt">{{ formatRelativeTime(reply.createdAt) }}</time>
            </div>
            <div class="comment-content">
              {{ reply.content }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-comments">
      {{ t('blog.noComments', 'No comments yet. Be the first to share your thoughts!') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/useUserSocket";

const props = defineProps<{
  postSlug: string;
}>();

const { t, locale } = useI18n();
const localePath = useLocalePath();
const userStore = useUserStore();

const newComment = ref('');
const submitting = ref(false);

const { data: response, pending, refresh } = await useFetch<any>(() => `/api/v1/blog/${props.postSlug}/comments`);
const comments = computed(() => response.value?.data || []);

async function submitComment() {
  if (!newComment.value.trim()) return;
  
  submitting.value = true;
  try {
    await $fetch(`/api/v1/blog/${props.postSlug}/comments`, {
      method: 'POST',
      body: { content: newComment.value }
    });
    newComment.value = '';
    await refresh();
  } catch (e) {
    console.error('Failed to post comment:', e);
  } finally {
    submitting.value = false;
  }
}

function replyTo(parentId: number) {
  // Implement reply logic
  console.log('Replying to:', parentId);
}

function formatRelativeTime(date: string) {
  // @ts-ignore: custom property
  return new Date(date).relativeTime?.(locale.value) || date;
}

// Add a relative time helper if not available
if (import.meta.client && !Date.prototype.hasOwnProperty('relativeTime')) {
  // @ts-ignore: augmenting Date prototype
  Date.prototype.relativeTime = function (locale = 'en') {
    const diff = new Date().getTime() - this.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };
}
</script>

<style lang="scss" scoped>
.comment-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.add-comment-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  textarea {
    background: $primary3;
    border: 1px solid $lines;
    padding: 1rem;
    border-radius: 8px;
    color: $secondary4;
    resize: vertical;
    &:focus { outline: none; border-color: $accent1; }
  }

  button {
    align-self: flex-end;
    background: $accent1;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
}

.comment-item {
  border-left: 3px solid $lines;
  padding-left: 1.5rem;
  margin-bottom: 2rem;

  .comment-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 0.5rem;
    .author-name { font-weight: bold; color: $secondary2; }
    time { font-size: 0.8rem; color: $secondary1; }
  }

  .comment-content { line-height: 1.6; color: $secondary4; }

  .comment-actions {
    margin-top: 0.5rem;
    button { background: none; border: none; color: $secondary1; font-size: 0.8rem; cursor: pointer; &:hover { color: $accent1; } }
  }
}

.replies-list {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  .reply-item { margin-bottom: 0; }
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
