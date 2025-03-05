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
        <img
          src="/imgs/meTwentyFour.jpg"
          alt="personal-img"
          class="mi-imagen"
        >
        <div class="auth-aside">
          <p>@bader-idris</p>
          <p>{{ createTimeCodeSnippet }}</p>
        </div>
      </div>
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
const { t } = useI18n()

useSeoMeta({
  title: t('about.personal.title'),
  description: t('about.personal.description'),
})

useSchemaOrg([
  {
    "@type": "AboutPage",
    name: "About Bader Idris",
    description: "Learn more about Bader Idris, a full-stack developer.",
    mainEntity: {
      "@type": "Person",
      name: "Bader Idris",
      jobTitle: "Full-Stack Developer",
      description: "A skilled developer excelling in Nuxt.js, Express.js, and more."
    }
  }
])

const codeBlock = ref<HTMLElement | null>(null)
const bioContainer = ref<HTMLElement | null>(null)

// Calculate the duration since June 15, 2022
const startDate = new Date('2022-06-15')
const currentDate = new Date()
const diffInMs = currentDate.getTime() - startDate.getTime()
const diffInYears = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 365.25))
const diffInMonths = Math.floor(
  (diffInMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44),
)

interface Segment {
  text: string
  isBold: boolean
}

// const bio = ref(t('about.bio'))
const bio = ref<string>(`
I started my programming journey on June 15, 2022, which means I've been honing my skills for ${diffInYears} years and ${diffInMonths} months.

Since then, I've gained solid expertise in:
✅ **Web Development**: Mastered HTML5, CSS3, and JavaScript to build dynamic, responsive websites. I then expanded into **Vue.js (Composition API and Vue Router 4)**, to create sophisticated front-end applications.

✅ **Backend Development**: I built five back-end projects using **Node.js, Express.js, and MongoDB** as part of the FreeCodeCamp curriculum. This journey helped me gain a strong foundation in creating RESTful APIs and deploying full-stack applications.

✅ **Database Management**: After learning **MongoDB**, I furthered my knowledge with **PostgreSQL (PSQL)**, focusing on scalable and secure data solutions.

✅ **DevOps & Deployment**: I became proficient with **Docker**, deploying containerized applications, and configuring servers with **Nginx**. I've also gained skills in **DevOps** workflows to automate, optimize, and manage deployments efficiently.

✅ **Cross-Platform Development**: I leveraged **Capacitor.js** and **Electron** to build applications that work seamlessly across web, mobile (iOS/Android), and desktop (Windows/Mac/Linux).

As a versatile full-stack developer, I combine my technical knowledge with creativity to deliver scalable, secure, and efficient solutions for modern digital challenges. Let's collaborate to bring your ideas to life!
`)

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
let isDragging = false
let startY = 0
let scrollTop = 0

function handleMouseDown(event: MouseEvent | TouchEvent): void {
  if (window.innerWidth < 768) return // PC only check
  isDragging = true
  bioContainer.value?.classList.add('grabbing')
  startY = 'touches' in event ? event.touches[0].pageY : event.pageY
  scrollTop = bioContainer.value?.scrollTop || 0
}

function handleMouseMove(event: MouseEvent | TouchEvent): void {
  if (window.innerWidth < 768 || !isDragging || !bioContainer.value) return // PC only check
  const y = 'touches' in event ? event.touches[0].pageY : event.pageY
  bioContainer.value.scrollTop = scrollTop - (y - startY)
}

function handleMouseUp(): void {
  if (window.innerWidth < 768) return // PC only check
  isDragging = false
  bioContainer.value?.classList.remove('grabbing')
}

const createTimeCodeSnippet = computed(() => {
  const now = new Date()
  const then = new Date('2023-05-19T00:00:00.000Z')
  const diff = now.getTime() - then.getTime()
  const monthDiff = Math.floor(diff / (1000 * 60 * 60 * 24 * 30))
  return `created ${monthDiff} months ago`
})

onMounted(() => {
  if (codeBlock.value) hljs.highlightElement(codeBlock.value)
  if (bioContainer.value) {
    bioContainer.value.addEventListener('mousedown', handleMouseDown)
    bioContainer.value.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
})

onUnmounted(() => {
  if (bioContainer.value) {
    bioContainer.value.removeEventListener('mousedown', handleMouseDown)
    bioContainer.value.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
})
</script>

<style lang="scss">
.split-in-half {
  display: flex;
  justify-content: center;
  align-items: center;
  width: calc(100% - 300px);

  @media screen and (max-width: 768px) {
    width: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  @media screen and (min-width: 769px) {
    left: 300px;
    position: absolute;
    top: 0;
    height: calc(100vh - 180px);
  }

  > * {
    width: calc(50% - 20px);
    padding: 0 20px;

    @media screen and (max-width: 768px) {
      width: 100%;
      padding: 0 20px;
    }
  }

  .personal-bio {
    height: 50vh;
    overflow-y: scroll;
    cursor: grab;
    user-select: none;

    @media screen and (max-width: 768px) {
      & {
        overflow-y: auto;
      }
    }

    &.grabbing {
      cursor: grabbing;
    }

    @media screen and (max-width: 768px) {
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

    @media screen and (max-width: 768px) {
      margin-left: 40px;
      width: calc(100vw - 30px);
    }

    .code-author {
      display: flex;
      align-items: center;

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
