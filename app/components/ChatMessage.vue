<template>
  <div
    :class="[
      'message-bubble',
      isOwn ? 'sent' : 'received',
      { 'with-tail': hasTail }
    ]"
  >
    <div v-if="!isOwn" class="sender-name">{{ senderName }}</div>
    <div class="message-body" @click="handleSpoilerClick">
      <TiptapEditorContent :editor="editor" />
      <div class="message-meta">
        <span class="timestamp">{{ timestamp }}</span>
        <Icon v-if="isOwn" name="material-symbols:check-small-rounded" class="status-icon" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MyUnderline, MyLink, MySpoiler } from "~/composables/tiptapExt";

const props = defineProps<{
  content: string;
  senderName: string;
  timestamp: string;
  isOwn: boolean;
  hasTail?: boolean;
}>();

const editor = useEditor({
  content: props.content,
  editable: false,
  extensions: [
    TiptapStarterKit.configure({
      heading: false,
      codeBlock: false,
      bulletList: false,
      orderedList: false,
      blockquote: true,
    }),
    MyUnderline,
    MyLink,
    MySpoiler,
  ],
});

watch(() => props.content, (newContent) => {
  if (editor.value) {
    editor.value.commands.setContent(newContent);
  }
});

function handleSpoilerClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target.classList.contains('tg-spoiler')) {
    target.classList.toggle('revealed');
  }
}

onBeforeUnmount(() => {
  unref(editor)?.destroy();
});
</script>

<style lang="scss">
.message-bubble {
  max-width: 85%;
  padding: 6px 10px;
  position: relative;
  font-size: 0.95rem;
  line-height: 1.4;
  margin-bottom: 4px;
  word-break: break-word;

  &.sent {
    align-self: flex-end;
    background: #dcf8c6; // Classic Telegram green
    color: #000;
    border-radius: 12px 12px 0 12px;
    
    .sender-name {
      color: #4caf50;
    }

    .message-meta {
      color: #667781;
    }
  }

  &.received {
    align-self: flex-start;
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 12px 12px 12px 0;
    border: 1px solid var(--lines-color);

    .sender-name {
      color: var(--accent-primary);
    }

    .message-meta {
      color: var(--text-secondary);
    }
  }

  .sender-name {
    font-size: 0.8rem;
    font-weight: bold;
    margin-bottom: 2px;
  }

  .message-body {
    position: relative;
    padding-bottom: 4px;
    padding-right: 60px; // Space for meta
  }

  .message-meta {
    position: absolute;
    bottom: 0;
    right: 0;
    font-size: 0.7rem;
    display: flex;
    align-items: center;
    gap: 2px;
    user-select: none;
  }

  .ProseMirror {
    outline: none;
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;

    p {
      margin: 0;
    }

    blockquote {
      border-left: 2px solid currentColor;
      padding-left: 8px;
      margin: 4px 0;
      opacity: 0.8;
    }

    code {
      background: rgba(0,0,0,0.05);
      padding: 1px 4px;
      border-radius: 4px;
      font-family: var(--font-family-main);
    }

    .tg-spoiler {
      background: currentColor;
      border-radius: 3px;
      cursor: pointer;
      transition: background 0.3s;

      &.revealed {
        background: transparent;
      }
    }
    
    a {
      color: #3498db;
      text-decoration: underline;
    }
  }
}

/* Tails could be added with pseudo-elements if needed for true Telegram look */
</style>
