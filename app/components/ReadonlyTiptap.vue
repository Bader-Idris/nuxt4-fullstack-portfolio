<template>
  <div class="readonly-tiptap-wrapper">
    <TiptapEditorContent :editor="editor" class="tiptap-content" />
  </div>
</template>

<script setup lang="ts">
import { StarterKit } from '@tiptap/starter-kit';
import { EditorContent as TiptapEditorContent, useEditor } from '@tiptap/vue-3';

const props = defineProps<{
  content: string;
}>();

const editor = useEditor({
  content: props.content,
  editable: false,
  extensions: [StarterKit],
});

onBeforeUnmount(() => {
  unref(editor)?.destroy();
});
</script>

<style lang="scss">
.readonly-tiptap-wrapper {
  .tiptap-content {
    .ProseMirror {
      outline: none;
      line-height: 1.6;
      color: var(--text-primary);
    }
  }
}
</style>
