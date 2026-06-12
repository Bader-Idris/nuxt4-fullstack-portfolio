<template>
  <div class="comment-section">
    <ClientOnly>
      <!-- Logged in state -->
      <div v-if="userStore.isAuthenticated">
        <!-- Add Comment Form -->
        <div class="add-comment-form">
          <LazyTiptapEditor 
            v-model="newComment" 
            :placeholder="t('blog.addComment', 'Add a public comment...')" 
          />
          <button :disabled="submitting || !newComment.trim()" @click="submitComment(null)" >
            <span v-if="submitting" class="spinner"></span>
            {{ t('blog.postComment', 'Post Comment') }}
          </button>
        </div>

        <!-- Comments List -->
        <div v-if="pending" class="comments-loader">
          <CustomLoader />
        </div>
        <div v-else-if="comments && comments.length > 0" class="comments-list">
          <CommentItem 
            v-for="comment in comments" 
            :key="comment.id" 
            :comment="comment"
            :post-slug="postSlug"
            :active-reply-id="activeReplyId"
            :submitting-reply="submittingReply"
            @reply="(id) => activeReplyId = (activeReplyId === id ? null : id)"
            @cancel-reply="activeReplyId = null"
            @submit-reply="submitComment"
          />
        </div>
        <div v-else class="no-comments">
          {{ t('blog.noComments', 'No comments yet.') }}
        </div>
      </div>

      <!-- Locked / Guest state -->
      <div v-else class="locked-comment-section">
        <div class="lock-icon-container">
          <Icon name="material-symbols:lock-outline" class="lock-icon" />
        </div>
        <p class="lock-message">
          {{ t('blog.loginToCommentLock', 'This comment section is locked. Please login to post a comment.') }}
        </p>
        <button class="login-btn" @click="handleLoginRedirect">
          {{ t('blog.loginButton', 'Login') }}
        </button>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/useUserSocket";
import CommentItem from "./CommentItem.vue";

const props = defineProps<{ postSlug: string; }>();
const emit = defineEmits(['comment-added']);

const { t, locale } = useI18n();
const localePath = useLocalePath();
const userStore = useUserStore();
const route = useRoute();
const config = useRuntimeConfig();

const newComment = ref('');
const submitting = ref(false);
const submittingReply = ref(false);
const activeReplyId = ref<number | null>(null);

const { data: response, pending, refresh } = await useFetch<any>(() => `/api/v1/blog/${props.postSlug}/comments`);
const comments = computed(() => response.value?.data || []);

function handleLoginRedirect() {
  navigateTo(localePath('/login') + '?redirect=' + encodeURIComponent(route.fullPath));
}

async function submitComment(parentId: number | null, content?: string) {
  const commentContent = content || newComment.value;
  if (!commentContent.trim()) return;
  
  submitting.value = true;
  if (parentId) submittingReply.value = true;
  
  try {
    await $fetch(`/api/v1/blog/${props.postSlug}/comments`, {
      method: 'POST',
      body: { content: commentContent, parentId },
      baseURL: config.public.originUrl
    });
    
    if (parentId) {
      activeReplyId.value = null;
    } else {
      newComment.value = '';
    }
    await refresh();
    emit('comment-added');
  } catch (e) {
    console.error('Failed to post comment:', e);
  } finally {
    submitting.value = false;
    submittingReply.value = false;
  }
}
</script>

<style lang="scss" scoped>
.comment-section { display: flex; flex-direction: column; gap: 2rem; }
.add-comment-form, .reply-form { display: flex; flex-direction: column; gap: 0.5rem; }
.reply-form { margin-top: 1rem; border-left: 2px solid $lines; padding-left: 1rem; }
.reply-actions { display: flex; gap: 1rem; justify-content: flex-end; }
button { background: $accent1; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }

/* The hierarchy / "rake" structure */
.comment-item { 
  position: relative;
  border-left: 3px solid $lines; 
  padding: 1rem; 
  margin-bottom: 2rem; 
  background: rgba(1, 18, 33, 0.3);
  border-radius: 8px;
}
.replies-list { 
  margin-top: 1rem;
  padding-left: 2rem; /* Indentation */
  overflow: hidden;
  position: relative;
}
.reply-item { 
  border-left: 3px solid $accent2; 
  background: rgba(1, 18, 33, 0.6);
  margin-bottom: 1rem;
}
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.locked-comment-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3.5rem 2rem;
  background: rgba(1, 18, 33, 0.3);
  border: 1px dashed var(--lines-color, #1e2d3d);
  border-radius: 12px;
  text-align: center;
  backdrop-filter: blur(8px);
  margin: 1.5rem 0;

  .lock-icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    background: rgba(254, 165, 95, 0.1);
    border-radius: 50%;
    margin-bottom: 1.25rem;
    color: var(--accent-primary, #fea55f);
    border: 1px solid rgba(254, 165, 95, 0.25);

    .lock-icon {
      font-size: 2rem;
      width: 32px;
      height: 32px;
    }
  }

  .lock-message {
    font-size: 1.1rem;
    color: var(--accent-primary, #fea55f);
    margin-bottom: 1.5rem;
    max-width: 450px;
    line-height: 1.6;
    font-weight: 500;
  }

  .login-btn {
    background: var(--accent-secondary, #43d9ad);
    color: var(--bg-primary, #01080e);
    border: none;
    padding: 10px 24px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.3s ease;
    box-shadow: 0 4px 14px rgba(67, 217, 173, 0.3);

    &:hover {
      background: #39c79d;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(67, 217, 173, 0.4);
    }

    &:active {
      transform: translateY(0);
    }
  }
}
</style>
