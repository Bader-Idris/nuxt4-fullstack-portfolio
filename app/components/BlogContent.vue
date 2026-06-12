<template>
  <div class="blog-content-wrapper" dir="auto">
    <ClientOnly>
      <TiptapEditorContent v-if="editor" :editor="editor" />
      <template #fallback>
        <div class="ProseMirror" v-html="content"></div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";

const props = defineProps<{
  content: string;
}>();

const editor = ref<Editor | null>(null);

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

const initEditor = async () => {
  if (import.meta.server) return;

  try {
    const [
      { Editor: TiptapEditor },
      { CodeBlockLowlight },
      { all, createLowlight },
      { default: StarterKit }
    ] = await Promise.all([
      import("@tiptap/vue-3"),
      import("@tiptap/extension-code-block-lowlight"),
      import("lowlight"),
      import("@tiptap/starter-kit")
    ]);

    const lowlight = createLowlight(all);

    editor.value = new TiptapEditor({
      content: props.content,
      editable: false,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
        }),
        CodeBlockLowlight.configure({
          lowlight,
        }),
        Direction,
      ],
    }) as Editor;
  } catch (err) {
    console.error("[BlogContent.vue] Tiptap init error:", err);
    // Fallback logic is already handled by template #fallback or ClientOnly
  }
};

onMounted(() => {
  initEditor();
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
