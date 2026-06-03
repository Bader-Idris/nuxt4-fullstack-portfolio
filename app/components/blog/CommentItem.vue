<template>
  <div class="comment-item" :class="{ 'reply-item': isReply }">
    <div class="comment-header">
      <span class="author-name">{{ comment.author.name }}</span>
      <time :datetime="comment.createdAt">
        <!-- Render deterministic date on server, switch to relative on client -->
        <ClientOnly fallback-tag="span">
          {{ formatRelativeTime(comment.createdAt) }}
          <template #fallback>
            {{ new Date(comment.createdAt).toLocaleDateString(locale) }}
          </template>
        </ClientOnly>
      </time>
    </div>
    
    <div class="comment-content">
      <ClientOnly>
        <TiptapEditorContent v-if="editor" :editor="editor" />
      </ClientOnly>
    </div>
    
    <div class="comment-actions">
      <button @click="emit('reply', comment.id)">
        <Icon name="material-symbols:reply" /> {{ t('blog.reply', 'Reply') }}
      </button>
      <button v-if="comment.replies?.length > 0" @click="toggleReplies">
        <Icon :name="isExpanded ? 'material-symbols:expand-less' : 'material-symbols:expand-more'" />
        {{ isExpanded ? 'Hide' : `${comment.replies.length} Replies` }}
      </button>
    </div>

    <ClientOnly>
      <div v-if="activeReplyId === comment.id" class="reply-form">
        <TiptapEditor 
          v-model="localReplyContent" 
          :placeholder="t('blog.addComment', 'Add a reply...')" 
        />
        <div class="reply-actions">
          <button @click="emit('cancel-reply')" class="cancel-btn">{{ t('blog.cancel', 'Cancel') }}</button>
          <button @click="submitReply(comment.id)" :disabled="submittingReply">
            {{ t('blog.submitReply', 'Submit Reply') }}
          </button>
        </div>
      </div>
    </ClientOnly>

    <!-- Recursive rendering of replies -->
    <div v-if="comment.replies && comment.replies.length > 0" 
         ref="repliesContainer"
         class="replies-list"
         :style="{ height: 0, opacity: 0, overflow: 'hidden' }">
      <CommentItem 
        v-for="reply in comment.replies" 
        :key="reply.id" 
        :comment="reply"
        :post-slug="postSlug"
        :active-reply-id="activeReplyId"
        :submitting-reply="submittingReply"
        is-reply
        @reply="(id) => emit('reply', id)"
        @cancel-reply="emit('cancel-reply')"
        @submit-reply="(id, content) => emit('submit-reply', id, content)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { gsap } from "gsap";
import TiptapStarterKit from "@tiptap/starter-kit";

const props = defineProps<{ 
  comment: any; 
  postSlug: string; 
  isReply?: boolean;
  activeReplyId: number | null;
  submittingReply: boolean;
}>();

const emit = defineEmits(['reply', 'cancel-reply', 'submit-reply']);
const { t, locale } = useI18n();

const editor = useEditor({
  content: props.comment.content,
  editable: false,
  extensions: [TiptapStarterKit],
});

watch(() => props.comment.content, (newContent) => {
  if (editor.value && newContent !== editor.value.getHTML()) {
    editor.value.commands.setContent(newContent);
  }
});

onBeforeUnmount(() => {
  unref(editor)?.destroy();
});

const isExpanded = ref(false);
const repliesContainer = ref<HTMLElement | null>(null);
const localReplyContent = ref('');

function toggleReplies() {
  isExpanded.value = !isExpanded.value;
  const container = repliesContainer.value;
  if (container) {
    if (isExpanded.value) {
      gsap.fromTo(container, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.4, ease: "power2.out" });
    } else {
      gsap.to(container, { height: 0, opacity: 0, duration: 0.3, ease: "power2.in" });
    }
  }
}

function submitReply(parentId: number) {
  emit('submit-reply', parentId, localReplyContent.value);
  localReplyContent.value = '';
}

function formatRelativeTime(date: string) {
  const diff = new Date().getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(date).toLocaleDateString(locale.value);
}
</script>

<style lang="scss" scoped>
.comment-item { 
  position: relative;
  padding: 0.75rem; 
  margin-bottom: 0.5rem; 
  background: rgba($primary3, 0.4);
  border-radius: 8px;
  border-left: 3px solid $lines;
}
.reply-item { 
  margin-left: 1rem;
  border-left: 3px solid $accent2; 
  background: rgba($primary3, 0.6);
  /* Cap indentation to keep deep replies readable */
  @media (min-width: 768px) {
    margin-left: 1.5rem;
  }
}
.replies-list { 
  margin-top: 0.5rem;
  overflow: hidden;
}
.comment-header { display: flex; align-items: center; gap: 8px; margin-bottom: 0.2rem; }
.author-name { font-weight: bold; color: $secondary2; font-size: 0.8rem; }
time { font-size: 0.65rem; color: $secondary1; }
.comment-content { color: $secondary4; font-size: 0.9rem; line-height: 1.4; margin-bottom: 0.4rem; }
.comment-actions { display: flex; gap: 0.5rem; }
button { 
  background: transparent; border: 1px solid $lines; color: $secondary1; 
  padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 0.7rem;
  display: flex; align-items: center; gap: 4px;
  &:hover { border-color: $accent1; color: $accent1; }
}
.reply-form { margin: 0.5rem 0; padding: 0.5rem; background: $primary3; border-radius: 8px; }
.reply-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.3rem; }
.cancel-btn { background: transparent; border-color: $lines; }
</style>
