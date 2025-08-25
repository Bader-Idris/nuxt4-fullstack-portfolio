<template>
  <div class="personal-info split-in-half">
    <div
      ref="bioContainer"
      class="personal-bio"
    >
      <!-- Render each parsed line as a <p> element with bold formatting applied where necessary -->
      <p
        v-for="(line, index) in formattedBio"
        :key="index"
      >
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
          src="/imgs/meTwentyFour.jpg"
          alt="personal-img"
          class="mi-imagen"
          loading="lazy"
        ></img>
        <div class="auth-aside">
          <p>@bader-idris</p>
          <p>{{ createTimeCodeSnippet }}</p>
        </div>
      </div>
      <!-- <client-only>
        <tiptap-editor ref="codeBlock" class="javascript" />
      </client-only> -->
      <pre>
        <code
          ref="codeBlock"
          class="javascript"
        >
  const pigIt = (str) => {
    return str.split(' ').map(e => {
      return e.length > 0 && !e.match(/[!?@#$%^&*]/)
        ? e.substring(1) + e.slice(0, 1) + 'ay'
        : e;
    }).join(' ');
  };
        </code>
      </pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css' // You can change the theme here

const { t, locale } = useI18n()
const { $device } = useNuxtApp()

// SEO optimization using @nuxtjs/seo module
useSeoMeta({
  title: t('about.personal.title'),
  description: t('about.personal.description'),
  ogTitle: t('about.personal.title'),
  ogDescription: t('about.personal.description'),
  ogImage: useRuntimeConfig().public.originUrl + '/imgs/meTwentyFour.jpg',
  twitterCard: 'summary_large_image',
})

// Schema.org structured data for better SEO
useSchemaOrg([
  {
    "@type": "AboutPage",
    name: t('about.personal.schema.name'),
    description: t('about.personal.schema.description'),
    mainEntity: {
      "@type": "Person",
      name: "Bader Idris",
      jobTitle: t('about.personal.schema.jobTitle'),
      description: t('about.personal.schema.personDescription'),
      image: useRuntimeConfig().public.originUrl + '/imgs/meTwentyFour.jpg',
      url: useRuntimeConfig().public.originUrl + useRoute().path,
      sameAs: [
        "https://github.com/bader-idris",
        "https://linkedin.com/in/bader-idris"
      ]
    }
  }
])

const codeBlock = ref<HTMLElement | null>(null)
const bioContainer = ref<HTMLElement | null>(null)

// Calculate the duration since June 15, 2022 with i18n support
const startDate = new Date('2022-06-15')
const currentDate = new Date()
const diffInMs = currentDate.getTime() - startDate.getTime()
const diffInYears = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 365.25))
const diffInMonths = Math.floor(
  (diffInMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44),
)

// Format the experience duration based on current locale
const formattedExperience = computed(() => {
  return t('about.personal.experienceDuration', {
    years: diffInYears,
    months: diffInMonths
  })
})

interface Segment {
  text: string
  isBold: boolean
}

// Use i18n for bio text with dynamic values
const bio = computed(() => {
  return t('about.personal.bio', {
    experience: formattedExperience.value
  })
})

// Function to process the bio and convert it into a structured format
function parseBioText(text: string): Segment[][] {
  return text.split('\n').map((line) => {
    const segments: Segment[] = []
    let match
    const boldRegex = /\*\*(.*?)\*\*/g

    let lastIndex = 0
    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: line.slice(lastIndex, match.index), isBold: false })
      }
      segments.push({ text: match[1], isBold: true })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < line.length) {
      segments.push({ text: line.slice(lastIndex), isBold: false })
    }

    return segments
  })
}

// Computed property to store the formatted bio
const formattedBio = computed(() => parseBioText(bio.value))

// --- Drag Handling Functions ---
const isDragging = ref(false)
const startY = ref(0)
const scrollTop = ref(0)

// Use device detection from @nuxtjs/device
const isMobile = computed(() => {
  return $device.isMobile
})

function handleMouseDown(event: MouseEvent | TouchEvent): void {
  if (isMobile.value) return // PC only check
  isDragging.value = true
  bioContainer.value?.classList.add('grabbing')
  startY.value = 'touches' in event ? event.touches[0].pageY : event.pageY
  scrollTop.value = bioContainer.value?.scrollTop || 0
}

function handleMouseMove(event: MouseEvent | TouchEvent): void {
  if (isMobile.value || !isDragging.value || !bioContainer.value) return // PC only check
  const y = 'touches' in event ? event.touches[0].pageY : event.pageY
  bioContainer.value.scrollTop = scrollTop.value - (y - startY.value)
}

function handleMouseUp(): void {
  if (isMobile.value) return // PC only check
  isDragging.value = false
  bioContainer.value?.classList.remove('grabbing')
}

// Format date with i18n support
const createTimeCodeSnippet = computed(() => {
  const now = new Date()
  const then = new Date('2023-05-19T00:00:00.000Z')
  
  // Use Intl.RelativeTimeFormat for localized relative time
  const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
  
  const diff = now.getTime() - then.getTime()
  const monthDiff = Math.floor(diff / (1000 * 60 * 60 * 24 * 30))
  
  return t('about.personal.createdTimeAgo', { 
    time: rtf.format(-monthDiff, 'month')
  })
})

// Use VueUse for better lifecycle management
useEventListener(bioContainer, 'mousedown', handleMouseDown)
useEventListener(bioContainer, 'mousemove', handleMouseMove)
useEventListener(document, 'mouseup', handleMouseUp)

onMounted(() => {
  if (codeBlock.value) hljs.highlightElement(codeBlock.value)
})
</script>

<style lang="scss">
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
    height: 50vh;
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
        // height: 80vh;
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
    }

    pre {
      border-right: 1px solid $lines;
      margin: 0;
      border-radius: 20px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    code {
      font-size: 14px;
      line-height: 1.5;
    }
  }
}
</style>
