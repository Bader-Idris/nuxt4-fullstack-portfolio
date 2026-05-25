<template>
  <div class="chat-input-wrapper">
    <div class="input-container">
      <TiptapBubbleMenu
        v-if="editor"
        :editor="editor"
        :tippy-options="{ duration: 100 }"
        class="bubble-menu"
      >
        <button
          type="button"
          @click="editor.chain().focus().toggleBold().run()"
          :class="{ 'is-active': editor.isActive('bold') }"
          title="Bold"
        >
          <Icon name="material-symbols:format-bold" />
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleItalic().run()"
          :class="{ 'is-active': editor.isActive('italic') }"
          title="Italic"
        >
          <Icon name="material-symbols:format-italic" />
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleUnderline().run()"
          :class="{ 'is-active': editor.isActive('underline') }"
          title="Underline"
        >
          <Icon name="material-symbols:format-underlined" />
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleStrike().run()"
          :class="{ 'is-active': editor.isActive('strike') }"
          title="Strikethrough"
        >
          <Icon name="material-symbols:format-strikethrough" />
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleCode().run()"
          :class="{ 'is-active': editor.isActive('code') }"
          title="Monospace"
        >
          <Icon name="material-symbols:code" />
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleSpoiler().run()"
          :class="{ 'is-active': editor.isActive('spoiler') }"
          title="Spoiler"
        >
          <Icon name="material-symbols:visibility-off" />
        </button>
        <button
          type="button"
          @click="setLink"
          :class="{ 'is-active': editor.isActive('link') }"
          title="Link"
        >
          <Icon name="material-symbols:link" />
        </button>
      </TiptapBubbleMenu>

      <TiptapEditorContent :editor="editor" class="tiptap-input" />
      
      <button
        class="send-btn"
        :disabled="isEditorEmpty"
        @click="handleSend"
      >
        <Icon name="material-symbols:send-rounded" width="24" height="24" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MyUnderline, MyLink, MySpoiler, MyPlaceholder, MyBubbleMenu } from "~/composables/tiptapExt";

const props = defineProps<{
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: "send", html: string): void;
}>();

const editor = useEditor({
  content: "",
  extensions: [
    TiptapStarterKit.configure({
      heading: false,
      codeBlock: false,
      bulletList: false,
      orderedList: false,
      blockquote: false, // We'll keep it simple for chat
    }),
    MyUnderline,
    MyLink.configure({
      openOnClick: false,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
    MySpoiler,
    MyPlaceholder.configure({
      placeholder: props.placeholder || "Write a message...",
    }),
    MyBubbleMenu,
  ],
  editorProps: {
    handleKeyDown: (view, event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        handleSend();
        return true;
      }
      return false;
    },
  },
});

const isEditorEmpty = computed(() => {
  if (!editor.value) return true;
  return editor.value.getText().trim() === "";
});

function setLink() {
  if (!editor.value) return;
  const previousUrl = editor.value.getAttributes("link").href;
  const url = window.prompt("URL", previousUrl);

  if (url === null) return;
  if (url === "") {
    editor.value.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.value.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

function handleSend() {
  if (!editor.value || isEditorEmpty.value) return;
  // Get HTML to preserve formatting
  const html = editor.value.getHTML();
  emit("send", html);
  editor.value.commands.clearContent();
}

const focus = () => {
  editor.value?.commands.focus();
};

defineExpose({
  focus,
});

onBeforeUnmount(() => {
  unref(editor)?.destroy();
});
</script>

<style lang="scss">
.chat-input-wrapper {
  background: var(--bg-secondary);
  border-radius: 20px;
  padding: 8px 15px;
  position: relative;
  border: 1px solid var(--lines-color);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);

  .bubble-menu {
    display: flex;
    gap: 2px;
    padding: 4px;
    background: #2b2b2b; // Dark Telegram-like bubble
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    z-index: 100;

    button {
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      &.is-active {
        color: var(--accent-primary);
        background: rgba(255, 255, 255, 0.15);
      }
    }
  }

  .input-container {
    display: flex;
    align-items: center;
    gap: 12px;

    .tiptap-input {
      flex: 1;
      max-height: 150px;
      overflow-y: auto;
      background: transparent;
      padding: 8px 0;
      color: var(--text-primary);

      .ProseMirror {
        outline: none;
        min-height: 24px;
        font-size: 1rem;
        line-height: 1.6;

        p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-secondary);
          pointer-events: none;
          height: 0;
        }

        .tg-spoiler {
          background: var(--text-primary);
          color: transparent;
          filter: blur(4px);
          cursor: pointer;
          border-radius: 3px;
          transition: filter 0.3s;
          &.revealed {
            filter: none;
            background: transparent;
            color: inherit;
          }
        }
        
        code {
          background: rgba(128, 128, 128, 0.1);
          color: var(--accent-primary);
          padding: 2px 4px;
          border-radius: 4px;
          font-family: monospace;
        }
        
        a {
          color: var(--accent-primary);
          text-decoration: underline;
        }
      }
    }

    .send-btn {
      background: none;
      color: var(--accent-primary);
      border: none;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s;

      &:hover:not(:disabled) {
        transform: scale(1.1);
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
    }
  }
}
</style>
