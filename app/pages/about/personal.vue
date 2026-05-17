<template>
  <div class="personal-info split-in-half">
    <div ref="bioContainer" class="personal-bio">
      <!-- Render each parsed line as a <p> element with bold formatting applied where necessary -->
      <p v-for="(line, index) in formattedBio" :key="index">
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
        <!-- ! OMG, nuxtImg is broken in last version -->
        <!-- <NuxtImg
          src="/imgs/meTwentyFour.jpg"
          alt="personal-img"
          class="mi-imagen"
          :placeholder="[50, 50, 75, 75]"
          format="webp"
          loading="lazy"
        /> -->
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
        <TiptapEditorContent v-if="editor" :editor="editor" />
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";
import { Flip } from "gsap/all";

const { t, locale } = useI18n();
const { $device } = useNuxtApp();
const config = useRuntimeConfig();

// Base image path
const imageBasePath = "/imgs/meTwentyFour.jpg";

// State to hold the final image path (shared between SSR and client)
const profileImage = useState("profileImage", () => imageBasePath);

// Generate WebP and set image path on server
if (import.meta.server) {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const inputPath = path.join(process.cwd(), "public/imgs/meTwentyFour.jpg");
  const outputPath = path.join(process.cwd(), "public/imgs/meTwentyFour.webp");

  try {
    // Generate WebP if it doesn't exist
    if (fs.existsSync(inputPath) && !fs.existsSync(outputPath)) {
      const sharp = (await import("sharp")).default;
      await sharp(inputPath).webp({ quality: 80 }).toFile(outputPath);
      console.log("[personal.vue] WebP generated");
    }

    // Set WebP path with originUrl for SSR
    if (fs.existsSync(outputPath)) {
      profileImage.value = `${config.public.originUrl}/imgs/meTwentyFour.webp`;
    } else {
      profileImage.value = `${config.public.originUrl}${imageBasePath}`;
    }
  } catch (error) {
    console.error("[personal.vue] Sharp error:", error);
    profileImage.value = `${config.public.originUrl}${imageBasePath}`;
  }
}

// SEO optimization using @nuxtjs/seo module
useSeoMeta({
  title: t("about.personal.title"),
  description: t("about.personal.description"),
  ogTitle: t("about.personal.title"),
  ogDescription: t("about.personal.description"),
  ogImage: profileImage.value,
  twitterCard: "summary_large_image",
});

// Schema.org structured data for better SEO
useSchemaOrg([
  {
    "@type": "AboutPage",
    name: t("about.personal.schema.name"),
    description: t("about.personal.schema.description"),
    mainEntity: {
      "@type": "Person",
      name: "Bader Idris",
      jobTitle: t("about.personal.schema.jobTitle"),
      description: t("about.personal.schema.personDescription"),
      image: profileImage.value,
      url: `${config.public.originUrl}${useRoute().path}`,
      sameAs: [
        "https://github.com/bader-idris",
        "https://linkedin.com/in/bader-idris",
      ],
    },
  },
]);

const bioContainer = ref<HTMLElement | null>(null);

// Tiptap Editor Setup
const lowlight = createLowlight(all);
const editor = useEditor({
  content: `
<pre><code class="language-javascript">
  const pigIt = (str) => {
    return str.split(' ').map(e => {
      return e.length > 0 && !e.match(/[!?@#$%^&*]/)
        ? e.substring(1) + e.slice(0, 1) + 'ay'
        : e;
    }).join(' ');
  };
</code></pre>
  `,
  editable: false,
  extensions: [
    TiptapStarterKit.configure({
      codeBlock: false,
    }),
    CodeBlockLowlight.configure({
      lowlight,
    }),
  ],
});

onBeforeUnmount(() => {
  unref(editor)?.destroy();
});

// Calculate the duration since June 15, 2022 with i18n support
const startDate = new Date("2022-06-15");
const currentDate = new Date();
const diffInMs = currentDate.getTime() - startDate.getTime();
const diffInYears = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 365.25));
const diffInMonths = Math.floor(
  (diffInMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44),
);

// Format the experience duration based on current locale
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

// Use i18n for bio text with dynamic values
const bio = computed(() => {
  return t("about.personal.bio", {
    experience: formattedExperience.value,
  });
});

// Function to process the bio and convert it into a structured format
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
      segments.push({ text: match[1], isBold: true });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      segments.push({ text: line.slice(lastIndex), isBold: false });
    }

    return segments;
  });
}

// Computed property to store the formatted bio
const formattedBio = computed(() => parseBioText(bio.value));

// --- Drag Handling Functions ---
const isDragging = ref(false);
const startY = ref(0);
const scrollTop = ref(0);

// Use device detection from @nuxtjs/device
const isMobile = computed(() => {
  return $device.isMobile;
});

function handleMouseDown(event: MouseEvent | TouchEvent): void {
  if (isMobile.value) return; // PC only check
  isDragging.value = true;
  bioContainer.value?.classList.add("grabbing");
  startY.value = "touches" in event ? event.touches[0].pageY : event.pageY;
  scrollTop.value = bioContainer.value?.scrollTop || 0;
}

function handleMouseMove(event: MouseEvent | TouchEvent): void {
  if (isMobile.value || !isDragging.value || !bioContainer.value) return; // PC only check
  const y = "touches" in event ? event.touches[0].pageY : event.pageY;
  bioContainer.value.scrollTop = scrollTop.value - (y - startY.value);
}

function handleMouseUp(): void {
  if (isMobile.value) return; // PC only check
  isDragging.value = false;
  bioContainer.value?.classList.remove("grabbing");
}

// Format date with i18n support
const createTimeCodeSnippet = computed(() => {
  const now = new Date();
  const then = new Date("2023-05-19T00:00:00.000Z");

  // Use Intl.RelativeTimeFormat for localized relative time
  const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: "auto" });

  const diff = now.getTime() - then.getTime();
  const monthDiff = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));

  return t("about.personal.createdTimeAgo", {
    time: rtf.format(-monthDiff, "month"),
  });
});

// --- GSAP Flip Animation Logic ---
const imageRef = ref<HTMLImageElement | null>(null);
const lightboxImageRef = ref<HTMLImageElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);
const isLightboxOpen = ref(false);

const toggleLightbox = async () => {
  if (!isLightboxOpen.value) {
    isLightboxOpen.value = true;
    await nextTick();

    // Capture original state
    const state = Flip.getState(imageRef.value, { props: "borderRadius" });

    // Switch visibility
    useGSAP().set(lightboxImageRef.value, { visibility: "visible" });
    useGSAP().set(imageRef.value, { visibility: "hidden" });

    // Fade in overlay
    useGSAP().fromTo(
      overlayRef.value,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: "power2.inOut" },
    );

    // Flip animation to lightbox
    Flip.from(state, {
      targets: lightboxImageRef.value,
      duration: 0.6,
      ease: "back.out(1.5)",
      scale: true,
    });
  } else {
    // Capture lightbox state
    const state = Flip.getState(lightboxImageRef.value, {
      props: "borderRadius",
    });

    // Switch visibility back
    useGSAP().set(imageRef.value, { visibility: "visible" });
    useGSAP().set(lightboxImageRef.value, { visibility: "hidden" });

    // Fade out overlay
    useGSAP().to(overlayRef.value, {
      opacity: 0,
      duration: 0.4,
      ease: "power2.inOut",
    });

    // Flip animation back to original place
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

// Removed the watch as logic is now handled in toggleLightbox

// Use VueUse for better lifecycle management
if (import.meta.client) {
  useEventListener(bioContainer, "mousedown", handleMouseDown);
  useEventListener(bioContainer, "mousemove", handleMouseMove);
  useEventListener(document, "mouseup", handleMouseUp);

  // Handle window resize to avoid GSAP/Flip sticking issues
  const handleResize = useThrottleFn(() => {
    if (isLightboxOpen.value) {
      // Force close if open to avoid calculation issues on layout shift
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

// Removed onMounted highlight.js call
</script>

<style lang="scss">
@import "highlight.js/styles/github-dark.css"; // Keep import or remove if tiptap handles styles fully, but we need base styles for tokens

.split-in-half {
  @include flex-container(row, nowrap, center, center);
  width: calc(100% - 300px);

  @include mobile {
    width: 100%;
    position: relative;
    @include flex-container(column, nowrap, unset, unset);
  }

  @include tablet-to-up {
    left: 300px;
    position: absolute;
    top: 0;
    height: calc($full-viewport-height - 180px);
  }

  > * {
    width: calc(50% - 20px);
    padding: 0 20px;

    @include mobile {
      width: 100%;
      padding: 0 20px;
    }
  }

  .personal-bio {
    height: 50dvh;
    overflow-y: scroll;
    cursor: grab;
    user-select: none;

    @include mobile {
      & {
        overflow-y: auto;
      }
    }

    &.grabbing {
      cursor: grabbing;
    }

    @include mobile {
      height: inherit;

      & p {
        // height: 80dvh;
        margin-bottom: 30px;
      }
    }
  }

  .code-snippet {
    border-radius: 40px;
    overflow-y: auto;
    max-height: 400px;
    padding: 20px;

    @include mobile {
      margin-left: 10px;
      width: calc($full-viewport-width - 30px);
    }

    .code-author {
      @include flex-container(row, nowrap, unset, center);
      .mi-imagen {
        width: 40px;
        height: 40px;
        border-radius: 12em;
        border: 2px solid $lines;
        margin-right: 15px;
        cursor: pointer; // Add cursor pointer to indicate it's clickable
        &.swelled {
          // position: absolute;
          // top: 50%;
          // left: 50%;
          // transform: scale(15) translate(-50%, -50%);

          position: fixed;
          top: 50%;
          left: 50%;
          transform: scale(15) translate(0%, 0);
        }
      }

      & p:first-of-type {
        color: $gradients1;
        font-weight: bold;
      }

      & p:nth-of-type(2) {
        font-size: $labels-size * 0.8;
      }

      & p {
        margin: 10px 0;
      }
    }

    & *:not(.code-author, .code-author *) {
      background-color: $code-snippets-bg;
      border-radius: 15px;
      padding: 0 5px;
      margin: 20px 0;
    }

    /* Target Tiptap's prose mirror structure */
    .ProseMirror {
      outline: none;

      pre {
        // border-right: 1px solid $lines;
        // margin: 0;
        // border-radius: 20px;
        // white-space: pre-wrap;
        // word-wrap: break-word;
        // background: transparent;
        // padding: 0;

        code {
          background: none;
          color: inherit;
          font-size: 14px;
          line-height: 1.5;
          padding: 0;
        }
      }
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