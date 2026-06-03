<template>
  <div class="comment-section">
    <!-- Add Comment Form -->
    <ClientOnly>
      <div v-if="userStore.isAuthenticated" class="add-comment-form">
        <TiptapEditor 
          v-model="newComment" 
          :placeholder="t('blog.addComment', 'Add a public comment...')" 
        />
        <button :disabled="submitting || !newComment.trim()" @click="submitComment(null)" >
          <span v-if="submitting" class="spinner"></span>
          {{ t('blog.postComment', 'Post Comment') }}
        </button>
      </div>
      <div v-else class="login-prompt">
        <p>{{ t('blog.loginToComment', 'Please login to leave a comment.') }} <NuxtLink :to="localePath('/login')">{{ t('auth.login', 'Login') }}</NuxtLink></p>
      </div>
    </ClientOnly>

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
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/useUserSocket";
import CommentItem from "./CommentItem.vue";

const props = defineProps<{ postSlug: string; }>();
const emit = defineEmits(['comment-added']);

const { t, locale } = useI18n();
const localePath = useLocalePath();
const userStore = useUserStore();

const newComment = ref('');
const submitting = ref(false);
const submittingReply = ref(false);
const activeReplyId = ref<number | null>(null);

const { data: response, pending, refresh } = await useFetch<any>(() => `/api/v1/blog/${props.postSlug}/comments`);
const comments = computed(() => response.value?.data || []);

async function submitComment(parentId: number | null, content?: string) {
  const commentContent = content || newComment.value;
  if (!commentContent.trim()) return;
  
  submitting.value = true;
  if (parentId) submittingReply.value = true;
  
  try {
    await $fetch(`/api/v1/blog/${props.postSlug}/comments`, {
      method: 'POST',
      body: { content: commentContent, parentId }
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
</style>
