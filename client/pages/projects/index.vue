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
import { ref, computed, watch, onMounted } from 'vue'

useHead({
  title: 'Projects I created during my career',
  meta: [
    { name: 'description', content: 'Explore projects by Bader Idris, showcasing expertise in responsive web design, e-commerce, multi-step forms, todo apps, and stunning agency web apps. Powered by Vue.js, TypeScript, Node.js, and more.' },
  ],
})

const sidebarDisplay = ref('block')
const list = ref<Array<{ title: string, imgAlt: string, isActive: boolean }>>([
  { title: 'HTML', imgAlt: 'html icon', isActive: true },
  { title: 'CSS', imgAlt: 'css icon', isActive: false },
  { title: 'Vue', imgAlt: 'vue icon', isActive: false },
  // { title: "Docker", imgAlt: "docker icon", isActive: false },
  { title: 'Typescript', imgAlt: 'Typescript icon', isActive: false },
  // { title: "Express", imgAlt: "Express icon", isActive: false },
  // { title: "Shell", imgAlt: "shell icon", isActive: false },
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

  @media (max-width: 768px) {
    @include phone-borders;
  }
}
</style>
