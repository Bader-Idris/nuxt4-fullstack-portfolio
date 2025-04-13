<template>
  <editor-content :editor="editor" />
</template>

<script setup lang="ts">
// import { Editor, EditorContent } from '@tiptap/vue-3'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import CodeBlock from '@tiptap/extension-code-block'

// import Table from '@tiptap/extension-table'
// import TableRow from '@tiptap/extension-table-row'
// import TableCell from '@tiptap/extension-table-cell'
// import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'

// Define props to make content configurable // TODO: do we need it with ts
const props = defineProps({
  content: {
    type: String,
    default: '',
  },
})

const editor = useEditor({
  content: props.content || `
<code>
  const pigIt = (str) => {
    return str.split(' ').map(e => {
      return e.length > 0 && !e.match(/[!?@#$%^&*]/)
        ? e.substring(1) + e.slice(0, 1) + 'ay'
        : e;
    }).join(' ');
  };
</code>
  `,
  extensions: [
    StarterKit,
    CodeBlock,  // Code blocks
    // Table.configure({
    //   resizable: true, // Allow resizing tables
    // }),
    // TableRow,
    // TableCell,
    // Image,
    Link,
  ],
})
</script>
