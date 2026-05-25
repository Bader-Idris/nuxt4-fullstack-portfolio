<template>
  <div class="blog-content-wrapper" dir="auto">
    <ClientOnly>
      <TiptapEditorContent v-if="editor" :editor="editor" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";

const props = defineProps<{
  content: string;
}>();

const lowlight = createLowlight(all);

// Custom extension to handle text direction automatically
const Direction = TiptapExtension.create({
  name: "direction",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "blockquote", "codeBlock", "listItem"],
        attributes: {
          dir: {
            default: "auto",
            renderHTML: (attributes) => ({
              dir: attributes.dir,
            }),
            parseHTML: (element) => element.getAttribute("dir") || "auto",
          },
        },
      },
    ];
  },
});

const editor = useEditor({
  content: props.content,
  editable: false,
  extensions: [
    TiptapStarterKit.configure({
      codeBlock: false,
    }),
    CodeBlockLowlight.configure({
      lowlight,
    }),
    Direction,
  ],
});

watch(() => props.content, (newContent) => {
  if (editor.value && newContent !== editor.value.getHTML()) {
    editor.value.commands.setContent(newContent);
  }
});

onBeforeUnmount(() => {
  unref(editor)?.destroy();
});
</script>

<style lang="scss">
.blog-content-wrapper {
  .ProseMirror {
    outline: none;
    line-height: 1.6;
    font-size: 1.1rem;

    p {
      margin-bottom: 1.5rem;
      text-align: start;
    }

    h1, h2, h3, h4, h5, h6 {
      margin-top: 2rem;
      margin-bottom: 1rem;
      font-weight: bold;
      text-align: start;
    }

    pre {
      background: $code-snippets-bg;
      border-radius: 15px;
      padding: 1.5rem;
      margin: 1.5rem 0;
      overflow-x: auto;

      code {
        background: none;
        color: inherit;
        font-size: 0.9rem;
        padding: 0;
      }
    }

    blockquote {
      border-left: 4px solid $accent1;
      padding-left: 1rem;
      margin: 1.5rem 0;
      font-style: italic;
      color: $secondary1;
      
      &[dir="rtl"] {
        border-left: none;
        border-right: 4px solid $accent1;
        padding-left: 0;
        padding-right: 1rem;
      }
    }

    ul, ol {
      padding-inline-start: 1.5rem;
      margin-bottom: 1.5rem;
      
      li {
        margin-bottom: 0.5rem;
      }
    }
  }
}
</style>
