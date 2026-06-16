<template>
  <div class="personal-info split-in-half">
    <div ref="bioContainer" class="personal-bio">
      <!-- Render each parsed line as a <p> element with bold formatting applied where necessary -->
      <p v-for="(line, index) in formattedBio" :key="index" dir="auto">
        <span
          v-for="(segment, i) in line"
          :key="i"
          :class="segment.isBold ? 'bold-text' : ''"
        >
          {{ segment.text }}
        </span>
      </p>
    </div>

    <div class="code-snippet">
      <div class="code-author">
        <img
          ref="imageRef"
          :src="profileImage"
          alt="personal-img"
          class="mi-imagen"
          loading="lazy"
          data-flip-id="profile-pic"
          @click="toggleLightbox"
        />

        <Teleport to="body">
          <div
            v-show="isLightboxOpen"
            ref="overlayRef"
            class="lightbox-overlay"
            @click="toggleLightbox"
          >
            <img
              ref="lightboxImageRef"
              :src="profileImage"
              alt="personal-img-lightbox"
              class="lightbox-img"
            />
          </div>
        </Teleport>
        <div class="auth-aside">
          <p>@bader-idris</p>
          <p>{{ createTimeCodeSnippet }}</p>
        </div>
      </div>
      <ClientOnly>
        <div class="code-block-container">
          <button class="copy-code-btn" @click="copyCode" :aria-label="t('about.personal.copyCode', 'Copy code')">
            <Icon :name="copied ? 'mdi:check' : 'mdi:content-copy'" size="20" />
          </button>
          <TiptapEditorContent v-if="editor" :editor="editor" />
        </div>
        <template #fallback>
          <div class="code-block-container ssr-fallback">
             <div class="ProseMirror" v-html="initialEditorContent"></div>
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Flip } from "gsap/all";
import { toast } from "vue3-toastify";
import type { Editor } from "@tiptap/vue-3";

// Core composables
const { t, locale } = useI18n();
const device = useDevice();
const config = useRuntimeConfig();
const route = useRoute();

/**
 * ARCHITECTURE NOTE:
 * We use a hybrid SSR/Client approach for the bio and code snippet.
 * 1. Image processing happens on the server (Sharp) to generate WebP.
 * 2. SEO metadata and Schema.org are generated for both SSR and SSG.
 * 3. Tiptap Editor is initialized DEFENSIVELY on the client only.
 *    We use dynamic imports for highlight.js/lowlight to avoid app-breaking SyntaxErrors 
 *    during initialization/SSR.
 * 4. A static fallback is provided for the code snippet to ensure it's indexable by SEO.
 */

// Image Handling - WebP Generation & Pathing
const imageBasePath = "/imgs/meTwentyFour.jpg";
const profileImage = useState("profileImage", () => imageBasePath);

if (import.meta.server) {
  const [fs, path, sharpModule] = await Promise.all([
    import("node:fs"),
    import("node:path"),
    import("sharp"),
  ]);
  const sharp = sharpModule.default;

  const inputPath = path.join(process.cwd(), "public/imgs/meTwentyFour.jpg");
  const outputPath = path.join(process.cwd(), "public/imgs/meTwentyFour.webp");

  try {
    if (fs.existsSync(inputPath) && !fs.existsSync(outputPath)) {
      await sharp(inputPath).webp({ quality: 80 }).toFile(outputPath);
      console.log("[bio.vue] WebP generated");
    }

    if (fs.existsSync(outputPath)) {
      profileImage.value = `${config.public.originUrl}/imgs/meTwentyFour.webp`;
    } else {
      profileImage.value = `${config.public.originUrl}${imageBasePath}`;
    }
  } catch (error) {
    console.error("[bio.vue] Sharp error:", error);
    profileImage.value = `${config.public.originUrl}${imageBasePath}`;
  }
}

// SEO & Meta
const localePath = useLocalePath();
const fullPathWithLocale = localePath(route.path);

useSeoMeta({
  title: () => `${t("about.personal.title")} | Bio`,
  description: () => t("about.personal.description"),
  ogTitle: () => t("about.personal.title"),
  ogDescription: () => t("about.personal.description"),
  ogUrl: () => `${config.public.originUrl}${fullPathWithLocale}`,
  ogImage: () => profileImage.value,
  twitterCard: "summary_large_image",
  twitterTitle: () => t("about.personal.title"),
  twitterDescription: () => t("about.personal.description"),
  twitterImage: () => profileImage.value,
});

if (import.meta.server) {
  useSchemaOrg([
    defineWebPage({
      name: () => `${t("about.personal.title")} | Bio`,
      description: () => t("about.personal.description"),
    }),
  ]);
}

// Bio Interaction & Scrolling
const bioContainer = ref<HTMLElement | null>(null);
useMiddleClickScroll(bioContainer);

// Code Snippet Copy Logic
const copied = ref(false);
const copyCode = async () => {
  if (import.meta.server) return;
  const codeElement = document.querySelector(".ProseMirror pre code") as HTMLElement | null;
  if (codeElement) {
    try {
      await navigator.clipboard.writeText(codeElement.innerText);
      copied.value = true;
      toast(t("messages.copied", "Copied to clipboard!"), {
        autoClose: 1000,
        type: "success",
        position: "bottom-right",
        theme: "dark",
      });
      setTimeout(() => (copied.value = false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  }
};

// Tiptap Editor Content Builder
const buildEditorContent = (tValue: typeof t) => `
<pre><code class="language-javascript">
  /**
   * ${tValue("about.personal.codeSnippet.functionComment")}
   */
  const pigIt = (str) => {
    return str.split(' ').map(e => {
      return e.length > 0 && !e.match(/[!?@#$%^&*]/)
        ? e.substring(1) + e.slice(0, 1) + 'ay'
        : e;
    }).join(' ');
  };

  // ${tValue("about.personal.codeSnippet.testComment")}
  console.log(pigIt('Pig latin is cool !'));
</code></pre>
`;

const initialEditorContent = computed(() => buildEditorContent(t));

// Tiptap Editor Initialization - Defensive Client-Only approach
const editor = shallowRef<Editor | null>(null);

onMounted(async () => {
  if (import.meta.server) return;

  try {
    // 1. Dynamically import modules that cause SyntaxErrors during SSR/Initialization
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

    // 2. Custom extension to handle text direction
    const Direction = TiptapExtension.create({
      name: "direction",
      addGlobalAttributes() {
        return [
          {
            types: ["paragraph", "heading", "blockquote", "codeBlock", "listItem"],
            attributes: {
              dir: {
                default: "auto",
                renderHTML: (attributes) => ({ dir: attributes.dir }),
                parseHTML: (element) => element.getAttribute("dir") || "auto",
              },
            },
          },
        ];
      },
    });

    // 3. Initialize the editor only on the client with full syntax highlighting
    editor.value = new TiptapEditor({
      content: initialEditorContent.value,
      editable: false,
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        CodeBlockLowlight.configure({ lowlight }),
        Direction,
      ],
    }) as Editor;
  } catch (err) {
    console.error("[bio.vue] Tiptap init error:", err);
  }
});

// Update editor content when locale changes
watch(locale, () => {
  editor.value?.commands.setContent(initialEditorContent.value);
});

onBeforeUnmount(() => {
  unref(editor)?.destroy();
});

// Bio Formatting Logic
const startDate = new Date("2022-06-15");
const currentDate = new Date();
const diffInMs = currentDate.getTime() - startDate.getTime();
const diffInYears = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 365.25));
const diffInMonths = Math.floor(
  (diffInMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44),
);

const formattedExperience = computed(() => {
  return t("about.personal.experienceDuration", {
    years: diffInYears,
    months: diffInMonths,
  });
});

interface Segment {
  text: string;
  isBold: boolean;
}

const bioText = computed(() => {
  return t("about.personal.bio", {
    experience: formattedExperience.value,
  });
});

function parseBioText(text: string): Segment[][] {
  return text.split("\n").map((line) => {
    const segments: Segment[] = [];
    let match;
    const boldRegex = /\*\*(.*?)\*\*/g;

    let lastIndex = 0;
    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          text: line.slice(lastIndex, match.index),
          isBold: false,
        });
      }
      segments.push({ text: match[1] ?? "", isBold: true });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      segments.push({ text: line.slice(lastIndex), isBold: false });
    }

    return segments;
  });
}

const formattedBio = computed(() => parseBioText(bioText.value));

// Drag to Scroll Logic
const isDragging = ref(false);
const startY = ref(0);
const scrollTop = ref(0);

function handleMouseDown(event: MouseEvent | TouchEvent): void {
  if (device.isMobile) return;
  isDragging.value = true;
  bioContainer.value?.classList.add("grabbing");
  startY.value = "touches" in event ? (event.touches[0]?.pageY ?? 0) : event.pageY;
  scrollTop.value = bioContainer.value?.scrollTop || 0;
}

function handleMouseMove(event: MouseEvent | TouchEvent): void {
  if (device.isMobile || !isDragging.value || !bioContainer.value) return;
  const y = "touches" in event ? (event.touches[0]?.pageY ?? startY.value) : event.pageY;
  bioContainer.value.scrollTop = scrollTop.value - (y - startY.value);
}

function handleMouseUp(): void {
  if (device.isMobile) return;
  isDragging.value = false;
  bioContainer.value?.classList.remove("grabbing");
}

const createTimeCodeSnippet = computed(() => {
  const then = new Date("2023-05-19T00:00:00.000Z");
  const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: "auto" });
  const diff = Date.now() - then.getTime();
  const monthDiff = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  return t("about.personal.createdTimeAgo", {
    time: rtf.format(-monthDiff, "month"),
  });
});

// GSAP Flip Lightbox Logic
const imageRef = ref<HTMLImageElement | null>(null);
const lightboxImageRef = ref<HTMLImageElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);
const isLightboxOpen = ref(false);

const toggleLightbox = async () => {
  if (import.meta.server) return;
  
  if (!isLightboxOpen.value) {
    isLightboxOpen.value = true;
    await nextTick();
    const state = Flip.getState(imageRef.value, { props: "borderRadius" });
    useGSAP().set(lightboxImageRef.value, { visibility: "visible" });
    useGSAP().set(imageRef.value, { visibility: "hidden" });
    useGSAP().fromTo(
      overlayRef.value,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: "power2.inOut" },
    );
    Flip.from(state, {
      targets: lightboxImageRef.value,
      duration: 0.6,
      ease: "back.out(1.5)",
      scale: true,
    });
  } else {
    const state = Flip.getState(lightboxImageRef.value, {
      props: "borderRadius",
    });
    useGSAP().set(imageRef.value, { visibility: "visible" });
    useGSAP().set(lightboxImageRef.value, { visibility: "hidden" });
    useGSAP().to(overlayRef.value, {
      opacity: 0,
      duration: 0.4,
      ease: "power2.inOut",
    });
    Flip.from(state, {
      targets: imageRef.value,
      duration: 0.6,
      ease: "power3.inOut",
      scale: true,
      onComplete: () => {
        isLightboxOpen.value = false;
      },
    });
  }
};

if (import.meta.client) {
  useEventListener(bioContainer, "mousedown", handleMouseDown);
  useEventListener(bioContainer, "mousemove", handleMouseMove);
  useEventListener(document, "mouseup", handleMouseUp);

  const handleResize = useThrottleFn(() => {
    if (isLightboxOpen.value) {
      isLightboxOpen.value = false;
      useGSAP().set(overlayRef.value, { opacity: 0 });
      useGSAP().set(lightboxImageRef.value, { visibility: "hidden" });
      useGSAP().set(imageRef.value, {
        clearProps: "all",
        visibility: "visible",
      });
    }
  }, 200);

  useEventListener(window, "resize", handleResize);
}

onBeforeMount(() => {
  if (import.meta.client) {
    useGSAP().registerPlugin(Flip);
  }
});
</script>

<style lang="scss">
@import "highlight.js/styles/github-dark.css";

/* VSCode-like Robust Syntax Highlighting Overrides */
.ProseMirror pre {
  /* background-color: #1e1e1e !important; Removed hardcoded color to preserve user's preferred background */
  color: #d4d4d4 !important;
  padding: 1.5rem !important;
  border-radius: 12px !important;
  font-family: "Fira Code", "IBM Plex Sans Arabic", "Cascadia Code", "Consolas", monospace !important;
  line-height: 1.6 !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  position: relative;

  code {
    background: none !important;
    color: inherit !important;
    font-size: 14px !important;
    padding: 0 !important;
  }

  /* Keywords: export, const, return, function, etc. */
  .hljs-keyword,
  .hljs-selector-tag,
  .hljs-literal,
  .hljs-section,
  .hljs-link {
    color: #c586c0 !important; /* Purple */
  }

  /* Arrow Function => and Operators */
  .hljs-operator,
  .hljs-punctuation,
  .hljs-meta {
    color: #d4d4d4 !important;
    opacity: 0.9;
  }

  /* Arrow Function Specific (if marked as symbol or meta by lowlight) */
  .hljs-symbol {
    color: #569cd6 !important; /* Blue */
  }

  /* Function Names */
  .hljs-title.function_,
  .hljs-title,
  .hljs-title.class_,
  .hljs-class .hljs-title {
    color: #dcdcaa !important; /* Yellowish */
  }

  /* Parameters and Variables */
  .hljs-params,
  .hljs-variable,
  .hljs-template-variable {
    color: #9cdcfe !important; /* Light Blue */
  }

  /* Strings */
  .hljs-string,
  .hljs-attribute,
  .hljs-addition {
    color: #ce9178 !important; /* Orange/Brown */
  }

  /* Comments */
  .hljs-comment,
  .hljs-quote {
    color: #6a9955 !important; /* Greenish Gray */
    font-style: italic;
  }

  /* Numbers and Built-ins */
  .hljs-number,
  .hljs-built_in,
  .hljs-bullet {
    color: #b5cea8 !important; /* Light Green */
  }

  /* Properties and Attributes */
  .hljs-attr,
  .hljs-type {
    color: #9cdcfe !important;
  }

  /* Tags (HTML/XML) */
  .hljs-tag,
  .hljs-name {
    color: #569cd6 !important; /* Blue */
  }
}

.code-block-container {
  position: relative;
  
  .copy-code-btn {
    position: absolute;
    top: 15px;
    right: 15px;
    z-index: 10;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: $secondary1;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: rgba($accent2, 0.1);
      color: $accent2;
      border-color: rgba($accent2, 0.3);
    }
    
    span {
      font-size: 16px;
    }
  }

  &.ssr-fallback {
    .ProseMirror {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 16px;
      border: 1px solid rgba($lines, 0.4);
      padding: 1.5rem;
      color: #d4d4d4;
      font-family: monospace;
      white-space: pre-wrap;
    }
  }
}

.split-in-half {
  @include flex-container(row, nowrap, center, center);
  width: 100%;
  height: 100%;
  padding: 40px;
  overflow-y: auto;
  gap: 60px;

  @include mobile {
    position: relative;
    @include flex-container(column, nowrap, unset, center);
    padding: 20px 15px;
    gap: 30px;
  }

  > * {
    flex: 1;
    min-width: 0;

    @include mobile {
      width: 100%;
      flex: none;
    }
  }

  .personal-bio {
    max-height: 50vh;
    overflow-y: auto;
    cursor: grab;
    user-select: none;
    padding: 10px 0;
    
    /* Dynamic scroll shadows using mask-image for transparency compatibility */
    mask-image: linear-gradient(to bottom, 
      transparent, 
      black 40px, 
      black calc(100% - 40px), 
      transparent
    );

    &.grabbing {
      cursor: grabbing;
    }

    &::-webkit-scrollbar {
      display: none;
    }

    @include mobile {
      height: inherit;
      max-height: none;
      mask-image: none;
      padding: 0;
      & p {
        margin-bottom: 30px;
      }
    }
  }

  .code-snippet {
    border-radius: 28px;
    overflow-y: auto;
    max-height: 50vh;
    padding: 30px;
    background-color: rgba($code-snippets-bg, 0.4);
    border: 1px solid rgba($lines, 0.8);
    backdrop-filter: blur(16px);
    transition: transform 0.3s ease, border-color 0.3s ease;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);

    &:hover {
      border-color: rgba($accent2, 0.4);
      transform: translateY(-5px);
    }

    @include mobile {
      margin-left: 0;
      width: 100%;
      max-height: none;
      border-radius: 15px;
      padding: 15px;
    }

    .code-author {
      @include flex-container(row, nowrap, unset, center);
      margin-bottom: 15px;

      .mi-imagen {
        width: 45px;
        height: 45px;
        border-radius: 50%;
        border: 2px solid $lines;
        margin-right: 15px;
        cursor: pointer;
        transition: transform 0.2s ease;

        &:hover {
          transform: scale(1.1);
        }
      }

      & p:first-of-type {
        color: $gradients1;
        font-weight: bold;
        margin: 0;
      }

      & p:nth-of-type(2) {
        font-size: $labels-size * 0.8;
        opacity: 0.7;
        margin: 4px 0 0 0;
      }
    }

    /* Target the code block background specifically */
    .code-block-container {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba($lines, 0.4);
    }

    .ProseMirror {
      outline: none;
      background: transparent !important;
    }
  }
}

.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  cursor: pointer;
  opacity: 0;
}

.lightbox-img {
  max-width: 90%;
  max-height: 90%;
  border-radius: 10px;
  object-fit: contain;
}
</style>
