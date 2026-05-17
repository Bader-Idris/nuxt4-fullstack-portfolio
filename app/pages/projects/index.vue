<template>
  <div class="projects">
    <NavbarProjects @toggle-sidebar="toggleSidebar" />
    <aside :style="{ display: sidebarDisplay }">
      <ProjectsSidebar
        :is-sidebar-hidden="isSidebarHidden"
        :list="list"
        @toggle-active="toggleActive"
      />
      <SelectedTabs :active-items="activeItems" @remove-item="removeItem" />
    </aside>
    <FilteredProjects :active-items="activeItems" />
  </div>
</template>

<script setup lang="ts">
import projects from "~/apis/projects_info.json";

// const img = useImage()
const { t } = useI18n();

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
    itemListElement: projects.map((project, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "CreativeWork",
        name: project.title,
        description: project.desc,
        url: project.url,
        image: project.img.startsWith("http")
          ? project.img
          : `${useRuntimeConfig().public.originUrl}${project.img}`,
      },
    })),
  },
]);

const sidebarDisplay = ref("block");
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
  // { title: 'Electron', imgAlt: 'Electron icon', isActive: true },
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
  if (isSidebarHidden.value) {
    isSidebarHidden.value = false;
    sidebarDisplay.value = "block"; // Show sidebar immediately
  } else {
    isSidebarHidden.value = true;
    // Fade out and then set display to none
    setTimeout(() => {
      sidebarDisplay.value = "none"; // Set display to none after fade-out
    }, 300); // Match this timing with your CSS transition duration
  }
};

onMounted(() => {
  const isMobileWidth = useMobile();
  // this is an ugly solution, but because the whole project is old, I don't care about fixing it
  if (isMobileWidth.value) {
    sidebarDisplay.value = "none";
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
  overflow-y: scroll !important;
  @include mainMiddleSettings;

  @include mobile {
    @include phone-borders;
  }
}
</style>