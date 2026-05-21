<template>
  <div class="elzero-projects-layout" :class="{ 'rtl-mode': isRtl }">
    <!-- Inner Sidebar Header (Desktop & Mobile Foldable) -->
    <NavbarProjects @toggle-sidebar="toggleSidebar" />

    <div class="content-wrapper">
      <!-- Workspace Explorer Sidebar -->
      <aside :class="{ 'sidebar-hidden': isSidebarHidden }">
        <div class="explorer-header">
          <Icon name="mdi:folder-open" width="16" height="16" />
          <span>{{ t("explorer_title", "EXPLORER: ELZERO 50") }}</span>
        </div>

        <!-- Search Bar -->
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('search_placeholder', 'Search challenges...')"
            class="search-input"
          />
          <Icon name="mdi:magnify" class="search-icon" />
        </div>

        <!-- Directory tree -->
        <div class="directories-list">
          <div
            v-for="(group, groupIndex) in categorizedProjects"
            :key="group.name"
            class="directory-group"
          >
            <div class="group-title" @click="toggleGroup(groupIndex)">
              <Icon
                :name="group.isOpen ? 'mdi:chevron-down' : 'mdi:chevron-right'"
                width="16"
                height="16"
                class="chevron-icon"
              />
              <Icon
                :name="
                  group.isOpen
                    ? 'mdi:folder-open-outline'
                    : 'mdi:folder-outline'
                "
                width="18"
                height="18"
                class="folder-icon"
              />
              <span>{{ group.name }}</span>
            </div>

            <div v-show="group.isOpen" class="group-children">
              <NuxtLink
                v-for="project in group.projects"
                :key="project.slug"
                :to="localePath('/projects/elzero-50-projects/' + project.slug)"
                class="file-link"
                :class="{ active: currentSlug === project.slug }"
                @click="onLinkClick"
              >
                <Icon
                  :name="project.icon"
                  width="16"
                  height="16"
                  class="file-icon"
                />
                <span class="file-number"
                  >{{ String(project.id).padStart(2, "0") }}.</span
                >
                <span class="file-name">{{
                  project.title[locale] || project.title.en
                }}</span>
              </NuxtLink>
            </div>
          </div>

          <div v-if="filteredCount === 0" class="no-results">
            {{ t("no_results", "No challenges found") }}
          </div>
        </div>
      </aside>

      <!-- Code Workspace / Dynamic Content Page -->
      <main class="workspace-main">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { elzeroProjectsList } from "~/apis/elzero_projects_data";

const { t, locale } = useI18n();
const localePath = useLocalePath();
const route = useRoute();

// Meta configuration
useSeoMeta({
  title: () => t("projects.title") + " | Elzero 50 Projects",
  description: () => t("projects.description"),
});

// Layout / Direction settings
const isRtl = computed(() => locale.value === "ar");
const currentSlug = computed(() => (route.params.id as string) || "");

// Sidebar folding states
const isSidebarHidden = ref(false);
const toggleSidebar = () => {
  isSidebarHidden.value = !isSidebarHidden.value;
};

// Fold/unfold sections
const sectionStates = ref([true, true, true]);
const toggleGroup = (index: number) => {
  sectionStates.value[index] = !sectionStates.value[index];
};

// Filter input
const searchQuery = ref("");

// Setup categorization groups
const categories = [
  {
    nameKey: "group_core",
    nameDefault: "01 - Core Challenges (01-10)",
    range: [1, 10],
  },
  {
    nameKey: "group_advanced",
    nameDefault: "02 - Intermediate Modules (11-30)",
    range: [11, 30],
  },
  {
    nameKey: "group_sandbox",
    nameDefault: "03 - UI Playgrounds (31-50)",
    range: [31, 50],
  },
];

const categorizedProjects = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();

  return categories.map((cat, index) => {
    // Filter projects within range matching query
    const projects = elzeroProjectsList.filter((proj) => {
      const range = cat.range;
      const inRange = proj.id >= range[0]! && proj.id <= range[1]!;
      if (!inRange) return false;

      if (!query) return true;

      const titleEn = proj.title.en.toLowerCase();
      const titleAr = proj.title.ar.toLowerCase();
      const titleEs = proj.title.es.toLowerCase();
      const descEn = proj.desc.en.toLowerCase();
      const descAr = proj.desc.ar.toLowerCase();
      const descEs = proj.desc.es.toLowerCase();
      const tags = proj.tags.join(" ").toLowerCase();

      return (
        titleEn.includes(query) ||
        titleAr.includes(query) ||
        titleEs.includes(query) ||
        descEn.includes(query) ||
        descAr.includes(query) ||
        descEs.includes(query) ||
        tags.includes(query)
      );
    });

    return {
      name: t(cat.nameKey, cat.nameDefault),
      isOpen: sectionStates.value[index],
      projects,
    };
  });
});

const filteredCount = computed(() => {
  return categorizedProjects.value.reduce(
    (acc, cat) => acc + cat.projects.length,
    0,
  );
});

// Auto-fold sidebar on mobile click
const onLinkClick = () => {
  const isMobileWidth = useMobile();
  if (isMobileWidth.value) {
    isSidebarHidden.value = true;
  }
};

onMounted(() => {
  const isMobileWidth = useMobile();
  if (isMobileWidth.value) {
    isSidebarHidden.value = true;
  }
});
</script>

<style lang="scss" scoped>
.elzero-projects-layout {
  @include mainMiddleSettings;
  display: flex;
  flex-direction: column;
  height: calc(#{$full-viewport-height} - 87px);
  width: 100%;
  color: $secondary1;

  &.rtl-mode {
    direction: rtl;
    .chevron-icon {
      transform: scaleX(-1);
    }
  }

  @include mobile {
    height: calc(#{$full-viewport-height} - 45px);
  }
}

.content-wrapper {
  display: flex;
  flex: 1;
  width: 100%;
  height: calc(100% - 40px); // subtract NavbarProjects height
  overflow: hidden;
}

aside {
  width: 300px;
  background-color: $primary3;
  border-right: 1px solid $lines;
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow-y: auto;
  flex-shrink: 0;

  .rtl-mode & {
    border-right: none;
    border-left: 1px solid $lines;
  }

  &.sidebar-hidden {
    width: 0;
    overflow: hidden;
    border-right: none;
    border-left: none;
  }

  @include mobile {
    position: absolute;
    top: 40px;
    bottom: 0;
    left: 0;
    z-index: 99;
    width: 85%;
    border-right: 1px solid $lines;

    .rtl-mode & {
      left: auto;
      right: 0;
      border-right: none;
      border-left: 1px solid $lines;
    }

    &.sidebar-hidden {
      width: 0;
      border: none;
    }
  }
}

.explorer-header {
  padding: 10px 15px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid $lines;
  display: flex;
  align-items: center;
  gap: 8px;
  color: $secondary4;
}

.search-box {
  position: relative;
  padding: 10px 15px;
  border-bottom: 1px solid $lines;

  .search-input {
    width: 100%;
    background-color: $primary1;
    border: 1px solid $lines;
    border-radius: 4px;
    padding: 8px 32px 8px 12px;
    color: $secondary4;
    font-family: $main-font;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;

    .rtl-mode & {
      padding: 8px 12px 8px 32px;
    }

    &:focus {
      border-color: $secondary3;
    }
  }

  .search-icon {
    position: absolute;
    right: 25px;
    top: 50%;
    transform: translateY(-50%);
    color: $secondary1;
    pointer-events: none;

    .rtl-mode & {
      right: auto;
      left: 25px;
    }
  }
}

.directories-list {
  flex: 1;
  padding: 15px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.directory-group {
  display: flex;
  flex-direction: column;
}

.group-title {
  display: flex;
  align-items: center;
  padding: 6px 15px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  color: $secondary4;
  gap: 6px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.03);
  }

  .folder-icon {
    color: $accent1;
  }
}

.group-children {
  display: flex;
  flex-direction: column;
  margin-left: 25px;
  margin-top: 4px;

  .rtl-mode & {
    margin-left: 0;
    margin-right: 25px;
  }
}

.file-link {
  display: flex;
  align-items: center;
  padding: 6px 15px;
  font-size: 13px;
  text-decoration: none;
  color: $secondary1;
  gap: 8px;
  border-radius: 4px 0 0 4px;
  transition: all 0.2s;

  .rtl-mode & {
    border-radius: 0 4px 4px 0;
  }

  &:hover {
    color: $secondary4;
    background-color: rgba(255, 255, 255, 0.02);
  }

  &.active {
    color: $accent2;
    background-color: rgba(67, 217, 173, 0.08);
    font-weight: bold;
  }

  .file-icon {
    color: $secondary1;
    opacity: 0.8;
  }

  &.active .file-icon {
    color: $accent2;
    opacity: 1;
  }

  .file-number {
    font-size: 11px;
    color: $secondary3;
  }
}

.no-results {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: $secondary1;
  font-style: italic;
}

.workspace-main {
  flex: 1;
  height: 100%;
  overflow: hidden;
  background-color: $primary2;
}
</style>