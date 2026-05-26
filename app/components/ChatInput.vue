<template>
  <div class="chat-input-wrapper">
    <div class="input-container" data-clarity-mask="true">
      <TiptapEditorContent 
        :editor="editor" 
        class="tiptap-input" 
        @click="handleInteraction"
        @dblclick="handleDoubleClick"
        @contextmenu.prevent="handleContextMenu"
      />
      
      <button
        class="send-btn"
        :disabled="isEditorEmpty"
        @click="handleSend"
      >
        <Icon name="material-symbols:send-rounded" width="24" height="24" />
      </button>

      <!-- Custom Formatting Context Menu -->
      <ContextMenu
        :show="showFormattingMenu"
        :x="menuPosition.x"
        :y="menuPosition.y"
        @close="showFormattingMenu = false"
      >
        <button @click="toggleMark('bold')" :class="{ 'is-active': editor?.isActive('bold') }">
          <Icon name="material-symbols:format-bold" /> Bold
        </button>
        <button @click="toggleMark('italic')" :class="{ 'is-active': editor?.isActive('italic') }">
          <Icon name="material-symbols:format-italic" /> Italic
        </button>
        <button @click="toggleMark('underline')" :class="{ 'is-active': editor?.isActive('underline') }">
          <Icon name="material-symbols:format-underlined" /> Underline
        </button>
        <button @click="toggleMark('strike')" :class="{ 'is-active': editor?.isActive('strike') }">
          <Icon name="material-symbols:format-strikethrough" /> Strike
        </button>
        <button @click="toggleMark('code')" :class="{ 'is-active': editor?.isActive('code') }">
          <Icon name="material-symbols:code" /> Code
        </button>
        <button @click="toggleMark('spoiler')" :class="{ 'is-active': editor?.isActive('spoiler') }">
          <Icon name="material-symbols:visibility-off" /> Spoiler
        </button>
        <button @click="setLink" :class="{ 'is-active': editor?.isActive('link') }">
          <Icon name="material-symbols:link" /> Link
        </button>
      </ContextMenu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MyUnderline, MyLink, MySpoiler, MyPlaceholder } from "~/composables/tiptapExt";

const props = defineProps<{
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: "send", html: string): void;
}>();

const showFormattingMenu = ref(false);
const menuPosition = reactive({ x: 0, y: 0 });

const editor = useEditor({
  content: "",
  extensions: [
    TiptapStarterKit.configure({
      heading: false,
      codeBlock: false,
      bulletList: false,
      orderedList: false,
      blockquote: false,
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

const isMobile = useMobile();

const handleInteraction = () => {
  // Focus logic handled by wrapper or selection elsewhere
};

const handleDoubleClick = (event: MouseEvent | TouchEvent) => {
  if (isMobile.value) {
    const clientX = 'clientX' in event ? event.clientX : (event as TouchEvent).touches[0].clientX;
    const clientY = 'clientY' in event ? event.clientY : (event as TouchEvent).touches[0].clientY;
    
    showFormattingMenu.value = true;
    menuPosition.x = clientX;
    menuPosition.y = clientY;
  }
};

const handleContextMenu = (event: MouseEvent | TouchEvent) => {
  const clientX = 'clientX' in event ? event.clientX : (event as TouchEvent).touches[0].clientX;
  const clientY = 'clientY' in event ? event.clientY : (event as TouchEvent).touches[0].clientY;
  
  showFormattingMenu.value = true;
  menuPosition.x = clientX;
  menuPosition.y = clientY;
};

function toggleMark(type: string) {
  if (!editor.value) return;
  const chain = editor.value.chain().focus();
  
  if (type === 'bold') chain.toggleBold().run();
  else if (type === 'italic') chain.toggleItalic().run();
  else if (type === 'underline') chain.toggleUnderline().run();
  else if (type === 'strike') chain.toggleStrike().run();
  else if (type === 'code') chain.toggleCode().run();
  else if (type === 'spoiler') chain.toggleSpoiler().run();
  
  showFormattingMenu.value = false;
}

function setLink() {
  if (!editor.value) return;
  const previousUrl = editor.value.getAttributes("link").href;
  const url = window.prompt("URL", previousUrl);

  if (url === null) return;
  if (url === "") {
    editor.value.chain().focus().extendMarkRange("link").unsetLink().run();
  } else {
    editor.value.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }
  showFormattingMenu.value = false;
}

function handleSend() {
  if (!editor.value || isEditorEmpty.value) return;
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
