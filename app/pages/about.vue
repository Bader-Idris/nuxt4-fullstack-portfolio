<template>
  <div class="about-me">
    <aside>
      <div class="tab">
        <img
          v-for="(icon, index) in icons"
          :key="icon.iconAlt"
          :src="icon.iconSrc"
          :alt="icon.iconAlt"
          :class="{ active: activeIconIndex === index }"
          loading="lazy"
          @click="setActiveIcon(index)"
        />
      </div>

      <div class="lists">
        <FoldableTab @toggle="toggleHobbies">
          <p>personal_info</p>
        </FoldableTab>

        <div
          v-show="!isHobbiesHidden"
          class="hobbies-bar"
          :class="{ hidden: isHobbiesHidden }"
        >
          <p
            v-for="(hobby, index) in hobbiesObj"
            :key="index"
            :class="{ active: activeHobbyIndex === index }"
            @click="setActiveHobby(index)"
          >
            <img
              :src="hobby.icon"
              :alt="hobby.iconAlt"
              width="20"
              height="20"
            />
            {{ hobby.title }}
          </p>
        </div>

        <FoldableTab
          :initially-folded="true"
          @toggle="toggleContact"
        >
          <p>contacts</p>
        </FoldableTab>

        <div
          v-show="!isContactHidden"
          class="personal-contact"
          :class="{ hidden: isContactHidden }"
        >
        <ClientOnly>
          <p @click="(openMailTo(0), copyToClipboard(0))">
            <Icon name="mdi:envelope" width="30" style="position: relative; top: 3px;" />
            {{ displayContactInfo[0] }}
            <Icon v-if="showIcon[0]" name="mdi:envelope" width="24" height="24" />
          </p>
          <p @click="copyToClipboard(1)">
            <Icon name="ic:baseline-phone" width="30" style="position: relative; top: 3px;" />
            {{ contInfo[1] }}
            <Icon v-if="showIcon[1]" name="mingcute:copy-fill" width="24" height="24" />
          </p>
        </ClientOnly>
        </div>
      </div>
    </aside>
    <main>
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
const { t } = useI18n()

definePageMeta({
  middleware: [
    (to) => {
      const localePath = useLocalePath()
      if (to.path === localePath('/about') || to.path === '/about') {
        return navigateTo(localePath('/about/personal'), { replace: true })
      }
    },
  ],
})

const route = useRoute()
const router = useRouter()
const activeIconIndex = ref(1)
const isHobbiesHidden = ref(false)
const isContactHidden = ref(true)
const activeHobbyIndex = ref(0)

useSeoMeta({
  title: t('about.title'),
  description: t('about.description'),
})

const isMobile = useMobile()
const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 768
}

const contInfo = ['contact@baderidris.com', '+970595744368']
const showIcon = ref([false, false])

const openMailTo = (index: number): void => {
  if (import.meta.client) {
    const email = contInfo[index]
    if (email) {
      window.location.href = `mailto:${email}`
    }
    else {
      console.error('Email not found at the specified index')
    }
  }
}

const copyToClipboard = async (index: number): Promise<void> => {
  if (import.meta.client) {
    try {
      await navigator.clipboard.writeText(contInfo[index])

      // Show icon for 1 second
      showIcon.value = showIcon.value.map((value, i) => (i === index ? true : value))
      setTimeout(() => {
        showIcon.value = showIcon.value.map((value, i) => (i === index ? false : value))
      }, 1000)
    }
    catch (error) {
      console.error('Failed to copy to clipboard: ', error)
    }
  }
}

const icons = useState('aboutIcons', () => [
  { iconSrc: '/imgs/svgs/shell.svg', iconAlt: 'shell', path: 'professional' },
  { iconSrc: '/imgs/svgs/circle.svg', iconAlt: 'circle', path: 'personal' },
  { iconSrc: '/imgs/svgs/game.svg', iconAlt: 'game', path: 'hobbies' },
])

const hobbiesObj = useState('aboutHobbies', () => [
  { title: 'bio',         icon: '/imgs/svgs/red-dir.svg', iconAlt: 'red folder' },
  { title: 'interests',   icon: '/imgs/svgs/green-dir.svg', iconAlt: 'green folder' },
  { title: 'education',   icon: '/imgs/svgs/purple-dir.svg', iconAlt: 'purple folder' },
  { title: 'high-school', icon: '/imgs/svgs/md-icon.svg', iconAlt: 'markdown icon' },
  { title: 'University',  icon: '/imgs/svgs/md-icon.svg', iconAlt: 'markdown icon' },
])

const config = useRuntimeConfig()

if (import.meta.server) {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const sharp = (await import('sharp')).default

  const processIcon = async (iconPath: string) => {
    const inputPath = path.join(process.cwd(), 'public', iconPath)
    const outputPath = inputPath.replace('.svg', '.webp')
    const webpPath = iconPath.replace('.svg', '.webp')

    if (fs.existsSync(inputPath)) {
      if (!fs.existsSync(outputPath)) {
        try {
          await sharp(inputPath)
            .webp({ quality: 80 })
            .toFile(outputPath)
          console.log(`[about.vue] WebP generated: ${webpPath}`)
        } catch (error) {
          console.error(`[about.vue] Sharp error for ${iconPath}:`, error)
          return `${config.public.originUrl}${iconPath}`
        }
      }
      // Return WebP path with originUrl for SSR
      return `${config.public.originUrl}${webpPath}`
    }
    // Fallback to original path with originUrl
    return `${config.public.originUrl}${iconPath}`
  }

  // Process main icons
  for (const icon of icons.value) {
    icon.iconSrc = await processIcon(icon.iconSrc)
  }

  // Process hobbies icons
  for (const hobby of hobbiesObj.value) {
    hobby.icon = await processIcon(hobby.icon)
  }
}

const toggleHobbies = () => {
  isHobbiesHidden.value = !isHobbiesHidden.value
}

const setActiveIcon = async (index: number) => {
  activeIconIndex.value = index
  await navigateTo(localePath(`/about/${icons.value[index].path}`))
}

const setActiveHobby = (index: number) => {
  activeHobbyIndex.value = index
}

const toggleContact = () => {
  isContactHidden.value = !isContactHidden.value
}

const displayContactInfo = computed(() => {
  return isMobile.value
    ? contInfo
    : [contInfo[0].slice(0, -10) + ' ...', contInfo[1]]
})

// Update activeIconIndex when route changes
watch(() => route.path, (newPath) => {
  const index = icons.value.findIndex(icon => newPath.includes(icon.path))
  if (index !== -1) {
    activeIconIndex.value = index
  }
}, { immediate: true })

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', checkScreenSize)
  }
})
</script>

<style lang="scss" scoped>
.about-me {
  @include mainMiddleSettings;

  @include mobile {
    @include phone-borders;
  }

  @include mobile {
    overflow-y: scroll;
    padding-bottom: 10dvh;
  }

  aside {
    width: 300px;
    display: flex;

    @include mobile {
      width: calc($full-viewport-width - 30px);
    }

    .tab {
      position: absolute;
      display: inline-flex;
      align-items: center;
      flex-direction: column;
      height: $full-viewport-height;
      width: 60px;
      border-right: 1px solid $lines;

      @include mobile {
        display: none;
      }

      img {
        margin: 10px;
        cursor: pointer;
        width: 24px;
        @include transition-ease;
        &:hover,
        &.active {
          filter: brightness(4);
          opacity: 0.9;
          @include transition-ease;
        }
      }
    }

    .lists {
      left: 60px;
      width: 240px;
      position: relative;
      display: inline-block;

      @include mobile {
        left: 0;
      }

      .hobbies-bar {
        margin-left: 30px;
        opacity: 1;
        visibility: visible;
        transition:
          opacity 0.5s ease,
          visibility 0.5s ease;

        &.hidden {
          opacity: 0;
          visibility: hidden;
          transition:
            opacity 0.5s ease,
            visibility 0.5s ease;
        }

        > p {
          @include transition-ease;
          &:hover {
            color: $secondary4;
            cursor: pointer;
            @include transition-ease;
          }

          &.active {
            color: $secondary4;
          }
        }
      }
    }
  }

  .personal-contact {
    position: relative;
    margin-left: 25px;
    opacity: 1;
    visibility: visible;
    transition:
      opacity 0.5s ease,
      visibility 0.5s ease;

    @include mobile {
      width: calc($full-viewport-width - 57px);
    }

    &.hidden {
      opacity: 0;
      visibility: hidden;
      transition:
        opacity 0.5s ease,
        visibility 0.5s ease;
    }

    p {
      @include transition-ease;
      margin: 10px;
      cursor: pointer;
      width: fit-content;

      @include mobile {
        width: 100%;
      }

      &:hover {
        @include transition-ease;
        color: $secondary4;
        cursor: pointer;
      }
    }
  }
}
</style>
