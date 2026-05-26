<template>
  <div
    class="tiptap-editor-wrapper"
    :class="{ 'is-focused': isFocused }"
    @click="handleWrapperClick"
    @dblclick="handleDoubleClick"
    @contextmenu.prevent="handleContextMenu"
  >
    <TiptapEditorContent :editor="editor" class="tiptap-content" />
    
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
    </ContextMenu>
  </div>
</template>

<script setup lang="ts">
import { MyUnderline, MyLink, MySpoiler, MyPlaceholder } from "~/composables/tiptapExt";

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

const emit = defineEmits(["update:modelValue", "focus", "blur"]);

const isFocused = ref(false);
const showFormattingMenu = ref(false);
const menuPosition = reactive({ x: 0, y: 0 });

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    TiptapStarterKit.configure({
      codeBlock: false,
    }),
    MyUnderline,
    MyLink.configure({
      openOnClick: false,
    }),
    MySpoiler,
    MyPlaceholder.configure({
      placeholder: props.placeholder || "Start typing...",
    }),
  ],
  onUpdate: ({ editor }) => {
    emit("update:modelValue", editor.getHTML());
  },
  onFocus: () => {
    isFocused.value = true;
    emit("focus");
  },
  onBlur: () => {
    isFocused.value = false;
    emit("blur");
  },
});

watch(() => props.modelValue, (value) => {
  if (editor.value && editor.value.getHTML() !== value) {
    editor.value.commands.setContent(value, false);
  }
});

const isMobile = useMobile();

const handleWrapperClick = () => {
  editor.value?.commands.focus();
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

// For PC right-click and mobile "holdly" (long press)
const handleContextMenu = (event: MouseEvent | TouchEvent) => {
  const clientX = 'clientX' in event ? event.clientX : (event as TouchEvent).touches[0].clientX;
  const clientY = 'clientY' in event ? event.clientY : (event as TouchEvent).touches[0].clientY;
  
  showFormattingMenu.value = true;
  menuPosition.x = clientX;
  menuPosition.y = clientY;
};

function toggleMark(type: string) {
  if (!editor.value) return;
  if (type === 'bold') editor.value.chain().focus().toggleBold().run();
  if (type === 'italic') editor.value.chain().focus().toggleItalic().run();
  if (type === 'underline') editor.value.chain().focus().toggleUnderline().run();
  if (type === 'strike') editor.value.chain().focus().toggleStrike().run();
  if (type === 'code') editor.value.chain().focus().toggleCode().run();
  if (type === 'spoiler') editor.value.chain().focus().toggleSpoiler().run();
  showFormattingMenu.value = false;
}

onBeforeUnmount(() => {
  unref(editor)?.destroy();
});
</script>

<style lang="scss">
.tiptap-editor-wrapper {
  background: $primary3;
  border: 1px solid $lines;
  border-radius: 8px;
  min-height: 150px;
  transition: all 0.3s ease;
  cursor: text;

  &:hover {
    border-color: $secondary1;
  }

  &.is-focused {
    border-color: $secondary2;
    box-shadow: 0 0 0 2px rgba($secondary2, 0.2);
  }

  .tiptap-content {
    padding: 12px 16px;
    height: 100%;

    .ProseMirror {
      outline: none;
      min-height: 120px;
      color: $secondary4;
      line-height: 1.6;

      p.is-editor-empty:first-child::before {
        content: attr(data-placeholder);
        float: left;
        color: $secondary1;
        opacity: 0.5;
        pointer-events: none;
        height: 0;
      }

      .tg-spoiler {
        background: $secondary4;
        color: transparent;
        filter: blur(4px);
        cursor: pointer;
        border-radius: 3px;
        &.revealed {
          filter: none;
          background: transparent;
          color: inherit;
        }
      }

      code {
        background: rgba(128, 128, 128, 0.1);
        color: $accent1;
        padding: 2px 4px;
        border-radius: 4px;
        font-family: $main-font;
      }

      a {
        color: $accent2;
        text-decoration: underline;
      }
    }
  }
}
</style>
