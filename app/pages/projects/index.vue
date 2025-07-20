<template>
  <div class="projects">
    <NavbarProjects @toggle-sidebar="toggleSidebar" />
    <aside :style="{ display: sidebarDisplay }">
      <ProjectsSidebar
        :is-sidebar-hidden="isSidebarHidden"
        :list="list"
        @toggle-active="toggleActive"
      />
      <SelectedTabs
        :active-items="activeItems"
        @remove-item="removeItem"
      />
    </aside>
    <FilteredProjects :active-items="activeItems" />
  </div>
</template>

<script setup lang="ts">
// const img = useImage()
const { t } = useI18n()

// const optimizedProjectsThumbnail = img('/imgs/projects_thumbnail.webp', {
//   width: 1200,
//   height: 630,
//   format: 'webp'
// });
const optimizedProjectsThumbnail = `${useRuntimeConfig().public.originUrl}/imgs/projects_thumbnail.webp`

useSeoMeta({
  title: t('projects.title'),
  description: t('projects.description'),
  ogTitle: t('projects.title'),
  ogDescription: t('projects.description'),
  ogImage: optimizedProjectsThumbnail,
  ogImageWidth: 1200,
  ogImageHeight: 630,
})

// defineOgImageComponent('projectsThumbnail', {
//   url: optimizedProjectsThumbnail,
//   width: 1200,
//   height: 630,
//   alt: t('projects.title'),
// })

useSchemaOrg([
  {
    "@type": "CollectionPage",
    name: "Projects I created during my career",
    description: "Explore projects by Bader Idris, showcasing expertise in responsive web design, e-commerce, multi-step forms, todo apps, and stunning agency web apps. Powered by Vue.js, TypeScript, Express.js, and more.",
  }
])

const sidebarDisplay = ref('block')
const list = ref<Array<{ title: string, imgAlt: string, isActive: boolean }>>([
  { title: 'HTML', imgAlt: 'html icon', isActive: true },
  { title: 'CSS', imgAlt: 'css icon', isActive: true },
  { title: 'Javascript', imgAlt: 'js icon', isActive: true },
  { title: 'Vue', imgAlt: 'vue icon', isActive: true },
  { title: 'Typescript', imgAlt: 'Typescript icon', isActive: true },
  { title: 'Sass', imgAlt: 'Sass icon', isActive: true },

  // TODO: add more projects to enable them!

  // { title: 'Android', imgAlt: 'Android icon', isActive: true },
  // { title: 'IOS', imgAlt: 'IOS icon', isActive: true },
  // { title: 'Docker', imgAlt: 'Docker icon', isActive: true },
  // { title: 'Nginx', imgAlt: 'Nginx icon', isActive: true },
  // { title: 'Nuxt', imgAlt: 'Nuxt icon', isActive: true },
  // { title: 'Electron', imgAlt: 'Electron icon', isActive: true },
  // { title: 'Bash', imgAlt: 'Bash icon', isActive: true },
])

// @ts-ignore
const toggleActive = (item) => {
  item.isActive = !item.isActive
  saveActiveItems()
}

const activeItems = computed(() => {
  return list.value.filter(item => item.isActive).map(item => item.title)
})

const saveActiveItems = () => {
  const activeItems = list.value.filter(item => item.isActive).map(item => item.title)
  localStorage.setItem('activeItems', JSON.stringify(activeItems))
}

const loadActiveItems = () => {
  try {
    // @ts-ignore
    const storedActiveItems = JSON.parse(localStorage.getItem('activeItems'))
    if (storedActiveItems) {
      list.value.forEach((item) => {
        item.isActive = storedActiveItems.includes(item.title)
      })
    }
  }
  catch (error) {
    console.error('Error loading active items:', error)
  }
}

// @ts-ignore
const removeItem = (itemTitle) => {
  const item = list.value.find(item => item.title === itemTitle)
  if (item) {
    item.isActive = false
    saveActiveItems()
  }
}

const isSidebarHidden = ref(false)
const toggleSidebar = () => {
  if (isSidebarHidden.value) {
    isSidebarHidden.value = false
    sidebarDisplay.value = 'block' // Show sidebar immediately
  }
  else {
    isSidebarHidden.value = true
    // Fade out and then set display to none
    setTimeout(() => {
      sidebarDisplay.value = 'none' // Set display to none after fade-out
    }, 300) // Match this timing with your CSS transition duration
  }
}

onMounted(() => {
  loadActiveItems()
})

watch(list, saveActiveItems, { deep: true })
</script>

<style lang="scss" scoped>
.projects {
  overflow-y: scroll !important;
  @include mainMiddleSettings;

  @include mobile {
    @include phone-borders;
  }
}
</style>
