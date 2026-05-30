<template>
  <div ref="projectsContainer" class="projects">
    <div class="projects-body">
      <aside :style="{ width: sidebarWidth + 'px' }" :class="{ 'is-resizing': isResizing }">
        <NavbarProjects @toggle-sidebar="toggleSidebar" />
        <div v-show="!isSidebarHidden" class="sidebar-scrollable-content">
          <ProjectsSidebar
            :is-sidebar-hidden="isSidebarHidden"
            :list="list"
            @toggle-active="toggleActive"
          />
        </div>
        <ResizeHandle @resize="handleResize" @start="isResizing = true" @stop="isResizing = false" />
      </aside>
      
      <div class="projects-main-content">
        <SelectedTabs :active-items="activeItems" @remove-item="removeItem" />
        <div class="projects-inner-padded">
          <ProjectSearchBar @search="handleSearch" />
          <FilteredProjects :active-items="activeItems" :search-query="searchQuery" />
        </div>
      </div>
    </div>

    <ScrollToTop :target="projectsContainer" />
  </div>
</template>

<script setup lang="ts">
import { projectsList } from "~/apis/projects_data";

const projectsContainer = ref<HTMLElement | null>(null);
useMiddleClickScroll(projectsContainer);

// const img = useImage()
const { t, locale } = useI18n();

const searchQuery = ref("");
const handleSearch = (q: string) => {
  searchQuery.value = q;
};

// Sidebar resizing logic
const sidebarWidth = ref(300);
const isResizing = ref(false);

const handleResize = (x: number) => {
  if (x >= 200 && x <= 600) {
    sidebarWidth.value = x;
  }
};

// const optimizedProjectsThumbnail = img('/imgs/projects_thumbnail.webp', {
//   width: 1200,
//   height: 630,
//   format: 'webp'
// });
const optimizedProjectsThumbnail = `${useRuntimeConfig().public.originUrl}/imgs/projects_thumbnail.webp`;

useSeoMeta({
  title: t("projects.title"),
  description: t("projects.description"),
  ogTitle: t("projects.title"),
  ogDescription: t("projects.description"),
  ogImage: optimizedProjectsThumbnail,
  ogImageWidth: 1200,
  ogImageHeight: 630,
});

useSchemaOrg([
  {
    "@type": "CollectionPage",
    name: t("projects.title"),
    description: t("projects.description"),
    dateModified: new Date().toISOString(),
    itemListElement: projectsList.map((project, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "CreativeWork",
        name: project.title[locale.value] || project.title.en,
        description: project.desc[locale.value] || project.desc.en,
        url: project.url,
        image: project.img.startsWith("http")
          ? project.img
          : `${useRuntimeConfig().public.originUrl}${project.img}`,
      },
    })),
  },
]);

const list = ref<Array<{ title: string; imgAlt: string; isActive: boolean }>>([
  { title: "HTML", imgAlt: "html icon", isActive: true },
  { title: "CSS", imgAlt: "css icon", isActive: true },
  { title: "Javascript", imgAlt: "js icon", isActive: true },
  { title: "Vue", imgAlt: "vue icon", isActive: true },
  { title: "Typescript", imgAlt: "Typescript icon", isActive: true },
  { title: "Sass", imgAlt: "Sass icon", isActive: true },

  // TODO: add more projects to enable them!

  // { title: 'Android', imgAlt: 'Android icon', isActive: true },
  // { title: 'IOS', imgAlt: 'IOS icon', isActive: true },
  { title: "Docker", imgAlt: "Docker icon", isActive: true },
  { title: "Nginx", imgAlt: "Nginx icon", isActive: true },
  { title: "Nuxt", imgAlt: "Nuxt icon", isActive: true },
  { title: 'Electron', imgAlt: 'Electron icon', isActive: true },
  { title: 'ThreeJs', imgAlt: 'ThreeJs icon', isActive: true },
  { title: 'CapacitorJs', imgAlt: 'CapacitorJs icon', isActive: true },
  // { title: 'Bash', imgAlt: 'Bash icon', isActive: true },
  // { title: 'NestJs', imgAlt: 'NestJs icon', isActive: true },
]);

// @ts-expect-error: item has an implicit any type
const toggleActive = (item) => {
  item.isActive = !item.isActive;
  saveActiveItems();
};

const activeItems = computed(() => {
  return list.value.filter((item) => item.isActive).map((item) => item.title);
});

const saveActiveItems = () => {
  const activeItems = list.value
    .filter((item) => item.isActive)
    .map((item) => item.title);
  localStorage.setItem("activeItems", JSON.stringify(activeItems));
};

const loadActiveItems = () => {
  try {
    // @ts-expect-error: localStorage.getItem can return null
    const storedActiveItems = JSON.parse(localStorage.getItem("activeItems"));
    if (storedActiveItems) {
      list.value.forEach((item) => {
        item.isActive = storedActiveItems.includes(item.title);
      });
    }
  } catch (error) {
    console.error("Error loading active items:", error);
  }
};

// @ts-expect-error: itemTitle has an implicit any type
const removeItem = (itemTitle) => {
  const item = list.value.find((item) => item.title === itemTitle);
  if (item) {
    item.isActive = false;
    saveActiveItems();
  }
};

const isSidebarHidden = ref(false);
const toggleSidebar = () => {
  isSidebarHidden.value = !isSidebarHidden.value;
};

onMounted(() => {
  const isMobileWidth = useMobile();
  // this is an ugly solution, but because the whole project is old, I don't care about fixing it
  if (isMobileWidth.value) {
    isSidebarHidden.value = true;
    // query select .foldable-tab add .is-folded
    const foldableTab = document.querySelector(".foldable-tab");
    if (foldableTab) {
      foldableTab.classList.add("is-folded");
    }
  }

  loadActiveItems();
});

watch(list, saveActiveItems, { deep: true });
</script>

<style lang="scss" scoped>
.projects {
  display: flex;
  flex-direction: column;
  height: calc(#{$full-viewport-height} - 87px);
  overflow: hidden;
  @include mainMiddleSettings;

  @include mobile {
    @include phone-borders;
    height: calc(#{$full-viewport-height} - 45px);
  }
}

.projects-body {
  display: flex;
  flex: 1;
  width: 100%;
  overflow: hidden;

  @include mobile {
    flex-direction: column;
    overflow-y: auto;
  }
}

aside {
  position: relative;
  flex-shrink: 0;
  border-right: 1px solid $lines;
  background-color: $primary3;
  display: flex;
  flex-direction: column;
  transition: width 0.1s ease-out;

  &.is-resizing {
    transition: none;
    user-select: none;
  }

  @include mobile {
    width: 100% !important;
    border-right: none;
    border-bottom: 1px solid $lines;
    flex-shrink: 0;
    max-height: 50vh;
  }
}

.sidebar-scrollable-content {
  flex: 1;
  overflow-y: auto;
}

.projects-main-content {
  flex: 1;
  padding: 0; // Edge-to-edge for tabs
  overflow-y: auto;
  background-color: $primary2;

  @include mobile {
    padding: 0;
  }
}

.projects-inner-padded {
  padding: 0 40px 40px;

  @include mobile {
    padding: 20px 15px;
  }
}
</style>
