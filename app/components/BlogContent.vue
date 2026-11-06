<template>
  <div
    ref="contentRootRef"
    class="blog-content-wrapper"
    dir="auto"
    @contextmenu="onContentContextMenu"
    @click="onContentClick"
  >
    <ClientOnly>
      <TiptapEditorContent v-if="editor" :editor="editor" />
      <template #fallback>
        <div class="ProseMirror" v-html="renderedContent"></div>
      </template>
    </ClientOnly>

    <!-- Content options: right-click on desktop, tap on touch devices -->
    <ContextMenu
      :show="menu.show"
      :x="menu.x"
      :y="menu.y"
      @close="menu.show = false"
    >
      <button
        v-for="item in menu.items"
        :key="item.label"
        type="button"
        @click="item.run()"
      >
        <Icon :name="item.icon" class="icon" /> {{ item.label }}
      </button>
    </ContextMenu>
  </div>
</template>

<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { toast } from "vue3-toastify";
import { all, createLowlight } from "lowlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {
  MyUnderline,
  MyLink,
  MySpoiler,
  MyTable,
  MyTableRow,
  MyTableCell,
  MyTableHeader,
  MyImage,
  MyTextAlign,
  MyHighlight,
  MyColor,
  MyTextStyle,
  MyTaskList,
  MyTaskItem,
  MyYoutube,
  MyHeading,
  MyCallout,
  Direction,
} from "~/composables/tiptapExt";

const props = defineProps<{
  content: string;
}>();

const editor = ref<Editor | null>(null);
const contentRootRef = ref<HTMLElement | null>(null);
const { t } = useI18n();

// Fallback sanitized SSR content
const renderedContent = computed(() => {
  return props.content || "";
});

const lowlight = createLowlight(all);

const initEditor = async () => {
  if (import.meta.server) return;

  try {
    const [{ Editor: TiptapEditor }, { default: StarterKit }] =
      await Promise.all([
        import("@tiptap/vue-3"),
        import("@tiptap/starter-kit"),
      ]);

    editor.value = new TiptapEditor({
      content: props.content,
      editable: false,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          heading: false,
        }),
        MyHeading.configure({
          levels: [1, 2, 3, 4, 5, 6],
        }),
        CodeBlockLowlight.configure({
          lowlight,
        }),
        MyUnderline,
        MyLink.configure({
          openOnClick: true,
          HTMLAttributes: {
            target: "_blank",
            rel: "noopener noreferrer",
          },
        }),
        MySpoiler,
        MyCallout,
        MyTable.configure({
          resizable: false,
        }),
        MyTableRow,
        MyTableCell,
        MyTableHeader,
        MyImage.configure({
          allowBase64: true,
          inline: false,
        }),
        MyYoutube.configure({
          width: 640,
          height: 360,
          nocookie: true,
        }),
        MyTextAlign.configure({
          types: [
            "heading",
            "paragraph",
            "tableCell",
            "tableHeader",
            "callout",
          ],
        }),
        MyHighlight.configure({
          multicolor: true,
        }),
        MyTextStyle,
        MyColor,
        MyTaskList,
        MyTaskItem.configure({
          nested: true,
        }),
        Direction,
      ],
    }) as Editor;

    nextTick(() => {
      enhanceContent();
    });
  } catch (err) {
    console.error("[BlogContent.vue] Tiptap init error:", err);
  }
};

// ─── Content options via context menu ────────────────────────────────────────
// No always-visible overlays (copy buttons, inline # anchors) — they collided
// with the article text. Instead: right-click on desktop, tap (on touch
// devices) on code blocks/headings opens a menu with the relevant actions.
// Plain left-clicks stay free for reading and native text selection.

interface ContentMenuItem {
  label: string;
  icon: string;
  run: () => void;
}

const menu = reactive({
  show: false,
  x: 0,
  y: 0,
  items: [] as ContentMenuItem[],
});

let coarsePointer = false;

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast(t("messages.copied"), {
      theme: "auto",
      type: "success",
      position: "bottom-right",
      autoClose: 1500,
    });
  } catch (err) {
    console.error("[BlogContent.vue] Copy failed:", err);
  }
  menu.show = false;
};

const slugifyHeading = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/[\s_]+/g, "-");

function buildMenuItems(e: MouseEvent): ContentMenuItem[] {
  const target = e.target as HTMLElement;
  const items: ContentMenuItem[] = [];

  const pre = target.closest("pre");
  const heading = target.closest("h1, h2, h3, h4, h5, h6");
  const anchor = target.closest("a");
  const selection = window.getSelection?.()?.toString() || "";

  if (pre) {
    const code = pre.querySelector("code")?.textContent || pre.textContent || "";
    items.push({
      label: "Copy Code",
      icon: "material-symbols:content-copy",
      run: () => copyToClipboard(code),
    });
  }

  if (heading) {
    if (!heading.id) heading.id = slugifyHeading(heading.textContent || "");
    const url = `${window.location.origin}${window.location.pathname}#${heading.id}`;
    items.push({
      label: "Copy Heading Link",
      icon: "material-symbols:link",
      run: () => copyToClipboard(url),
    });
  }

  if (anchor?.href) {
    items.push({
      label: "Open Link",
      icon: "material-symbols:open-in-new",
      run: () => window.open(anchor.href, "_blank", "noopener,noreferrer"),
    });
    items.push({
      label: "Copy Link",
      icon: "material-symbols:content-copy",
      run: () => copyToClipboard(anchor.href),
    });
  }

  if (selection) {
    items.push({
      label: "Copy Selection",
      icon: "material-symbols:content-copy",
      run: () => copyToClipboard(selection),
    });
  } else if (!pre && !heading && !anchor) {
    const block = target.closest("p, li, blockquote, td, th, .blog-callout");
    const text = block?.textContent?.trim();
    if (text) {
      items.push({
        label: "Copy Text",
        icon: "material-symbols:content-copy",
        run: () => copyToClipboard(text),
      });
    }
  }

  return items;
}

function openMenu(e: MouseEvent, items: ContentMenuItem[]) {
  // stopPropagation keeps ContextMenu's own outside-click closer from
  // immediately dismissing a menu opened by the same click/tap
  e.preventDefault();
  e.stopPropagation();
  menu.items = items;
  menu.x = e.clientX;
  menu.y = e.clientY;
  menu.show = true;
}

function onContentContextMenu(e: MouseEvent) {
  const items = buildMenuItems(e);
  if (items.length === 0) return; // nothing relevant → native browser menu
  openMenu(e, items);
}

function onContentClick(e: MouseEvent) {
  // Desktop: plain clicks must stay free (text selection, links). Only touch
  // taps open the menu, and only on code blocks / headings.
  if (!coarsePointer) return;
  const target = e.target as HTMLElement;
  if (!target.closest("pre, h1, h2, h3, h4, h5, h6")) return;
  const items = buildMenuItems(e);
  if (items.length === 0) return;
  openMenu(e, items);
}

// Add interactive Spoiler toggles + code language badges (no copy buttons)
const enhanceContent = () => {
  if (!contentRootRef.value) return;

  // 1. Enhance Code Blocks (language badge only — copy via context menu)
  const preElements = contentRootRef.value.querySelectorAll("pre");
  preElements.forEach((pre) => {
    if (pre.querySelector(".code-block-header")) return;

    const codeEl = pre.querySelector("code");
    const langClass = Array.from(codeEl?.classList || []).find((c) =>
      c.startsWith("language-")
    );
    const lang = langClass ? langClass.replace("language-", "").toUpperCase() : "CODE";

    const header = document.createElement("div");
    header.className = "code-block-header";

    const langBadge = document.createElement("span");
    langBadge.className = "code-lang";
    langBadge.textContent = lang;

    header.appendChild(langBadge);
    pre.insertBefore(header, pre.firstChild);
  });

  // 2. Interactive Spoiler toggles
  const spoilers = contentRootRef.value.querySelectorAll(".tg-spoiler");
  spoilers.forEach((spoiler) => {
    spoiler.addEventListener("click", () => {
      spoiler.classList.toggle("revealed");
    });
  });
};

onMounted(() => {
  coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  initEditor();
});

watch(
  () => props.content,
  (newContent) => {
    if (editor.value && newContent !== editor.value.getHTML()) {
      editor.value.commands.setContent(newContent);
      nextTick(() => {
        enhanceContent();
      });
    }
  }
);

onBeforeUnmount(() => {
  unref(editor)?.destroy();
});
</script>

<style lang="scss">
.blog-content-wrapper {
  .ProseMirror {
    outline: none;
    line-height: 1.8;
    font-size: 1.15rem;
    color: $secondary4;

    p {
      margin-bottom: 1.5rem;
      text-align: start;
    }

    h1, h2, h3, h4, h5, h6 {
      margin-top: 2.5rem;
      margin-bottom: 1.2rem;
      font-weight: 700;
      line-height: 1.35;
      text-align: start;
      scroll-margin-top: 80px;
    }

    h1 {
      font-size: 2.4rem;
      color: $gradients2;
      border-bottom: 1px solid $lines;
      padding-bottom: 0.6rem;
    }

    h2 {
      font-size: 1.9rem;
      color: $accent1;
    }

    h3 {
      font-size: 1.5rem;
      color: $accent2;
    }

    h4 {
      font-size: 1.25rem;
      color: $accent4;
    }

    h5 {
      font-size: 1.1rem;
    }

    h6 {
      font-size: 1rem;
      color: $secondary1;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    a {
      color: $accent2;
      text-decoration: underline;
      text-underline-offset: 4px;
      transition: color 0.15s;

      &:hover {
        color: color-mix(in srgb, $accent2 80%, white);
      }
    }

    code {
      background: rgba(128, 128, 128, 0.15);
      color: $accent1;
      padding: 3px 6px;
      border-radius: 4px;
      font-family: $main-font;
      font-size: 0.9em;
    }

    /* Code Blocks with Header & Copy Button */
    pre {
      background: $code-snippets-bg;
      border: 1px solid $lines;
      border-radius: 12px;
      margin: 2rem 0;
      overflow: hidden;
      position: relative;

      .code-block-header {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        padding: 8px 16px;
        background: rgba($primary1, 0.9);
        border-bottom: 1px solid $lines;
        font-size: 0.75rem;

        .code-lang {
          color: $accent1;
          font-weight: bold;
          letter-spacing: 0.05em;
          font-family: $main-font;
        }
      }

      code {
        display: block;
        background: none;
        color: inherit;
        font-size: 0.95rem;
        padding: 1.25rem 1.5rem;
        overflow-x: auto;
        line-height: 1.6;
        font-family: $main-font;
      }
    }

    blockquote {
      border-left: 4px solid $accent1;
      padding: 1rem 1.5rem;
      margin: 2rem 0;
      background: rgba($accent1, 0.05);
      border-radius: 0 10px 10px 0;
      font-style: italic;
      color: $secondary1;

      &[dir="rtl"] {
        border-left: none;
        border-right: 4px solid $accent1;
        border-radius: 10px 0 0 10px;
      }

      p:last-child {
        margin-bottom: 0;
      }
    }

    hr {
      border: none;
      border-top: 2px dashed $lines;
      margin: 3rem 0;
    }

    ul, ol {
      padding-inline-start: 2rem;
      margin-bottom: 1.5rem;

      li {
        margin-bottom: 0.5rem;
      }
    }

    /* Task Lists */
    ul[data-type="taskList"] {
      list-style: none;
      padding-inline-start: 0.5rem;

      li[data-type="taskItem"] {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 0.6rem;

        label {
          margin-top: 4px;

          input[type="checkbox"] {
            accent-color: $accent2;
            width: 18px;
            height: 18px;
            cursor: pointer;
          }
        }

        div {
          flex: 1;
        }

        &[data-checked="true"] > div {
          text-decoration: line-through;
          color: $secondary1;
        }
      }
    }

    /* Enterprise Tables */
    table {
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
      margin: 2rem 0;
      overflow-x: auto;
      display: block;
      border-radius: 10px;
      border: 1px solid $lines;

      tbody {
        display: table;
        width: 100%;
      }

      td, th {
        min-width: 120px;
        border: 1px solid $lines;
        padding: 12px 16px;
        vertical-align: top;
        box-sizing: border-box;
      }

      th {
        font-weight: 700;
        background: rgba($primary1, 0.95);
        color: $accent1;
        text-align: start;
      }

      tr:nth-child(even) td {
        background: rgba(255, 255, 255, 0.02);
      }
    }

    /* Callout / Alert Boxes */
    .blog-callout {
      padding: 1.25rem 1.5rem;
      margin: 2rem 0;
      border-radius: 10px;
      border-left: 4px solid;

      &[dir="rtl"] {
        border-left: none;
        border-right: 4px solid;
      }

      p:last-child {
        margin-bottom: 0;
      }

      &.blog-callout-info {
        border-color: #38bdf8;
        background: rgba(56, 189, 248, 0.08);
      }

      &.blog-callout-tip {
        border-color: #43d9ad;
        background: rgba(67, 217, 173, 0.08);
      }

      &.blog-callout-warning {
        border-color: #fea55f;
        background: rgba(254, 165, 95, 0.08);
      }

      &.blog-callout-danger {
        border-color: #f87171;
        background: rgba(248, 113, 113, 0.08);
      }

      &.blog-callout-note {
        border-color: #c98bdf;
        background: rgba(201, 139, 223, 0.08);
      }
    }

    /* Images */
    img {
      max-width: 100%;
      height: auto;
      border-radius: 12px;
      border: 1px solid $lines;
      margin: 2rem auto;
      display: block;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
    }

    /* YouTube Videos */
    div[data-youtube-video] {
      margin: 2rem 0;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid $lines;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);

      iframe {
        width: 100%;
        min-height: 420px;
        border: none;
        display: block;
      }
    }

    /* Spoilers */
    .tg-spoiler {
      background: $secondary4;
      color: transparent;
      filter: blur(5px);
      cursor: pointer;
      border-radius: 4px;
      padding: 1px 4px;
      transition: filter 0.2s, background 0.2s;

      &.revealed,
      &:hover {
        filter: none;
        background: rgba(255, 255, 255, 0.08);
        color: inherit;
      }
    }
  }
}
</style>
