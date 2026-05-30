<template>
  <div class="about-page">
    <div class="about-body">
      <aside :style="{ width: sidebarWidth + 'px' }" :class="{ 'is-resizing': isResizing }">
        <div class="activity-bar">
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

        <div class="explorer-lists">
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

          <FoldableTab :initially-folded="true" @toggle="toggleContact">
            <p>contacts</p>
          </FoldableTab>

          <div
            v-show="!isContactHidden"
            class="personal-contact"
            :class="{ hidden: isContactHidden }"
          >
            <ClientOnly>
              <p @click="(openMailTo(0), copyToClipboard(0))">
                <Icon
                  name="mdi:envelope"
                  width="25"
                />
                {{ displayContactInfo[0] }}
                <Icon
                  v-if="showIcon[0]"
                  name="mdi:envelope"
                  width="24"
                  height="24"
                />
              </p>
              <p @click="copyToClipboard(1)">
                <Icon
                  name="ic:baseline-phone"
                  width="25"
                />
                {{ contInfo[1] }}
                <Icon
                  v-if="showIcon[1]"
                  name="mingcute:copy-fill"
                  width="24"
                  height="24"
                />
              </p>
            </ClientOnly>
          </div>
        </div>
        <ResizeHandle @resize="handleResize" @start="isResizing = true" @stop="isResizing = false" />
      </aside>

      <main class="about-main-content">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const localePath = useLocalePath();
const { t } = useI18n();

definePageMeta({
  middleware: [
    (to) => {
      // Skip during initial client hydration to avoid
      // "Error preloading payload" and routing paralysis
      const nuxtApp = useNuxtApp();
      if (
        import.meta.client &&
        nuxtApp.isHydrating &&
        nuxtApp.payload.serverRendered
      ) {
        return;
      }

      const localePath = useLocalePath();
      if (
        to.path.replace(/\/$/, "") === localePath("/about").replace(/\/$/, "")
      ) {
        return navigateTo(localePath("/about/hobbies/bio"), { replace: true });
      }
    },
  ],
});

const route = useRoute();
const activeIconIndex = ref(1);
const isHobbiesHidden = ref(false);
const isContactHidden = ref(true);
const activeHobbyIndex = ref(0);

// Sidebar resizing logic
const sidebarWidth = ref(300);
const isResizing = ref(false);

const handleResize = (x: number) => {
  if (x >= 200 && x <= 600) {
    sidebarWidth.value = x;
  }
};

useSeoMeta({
  title: t("about.title"),
  description: t("about.description"),
  ogTitle: t("about.title"),
  ogDescription: t("about.description"),
});

useSchemaOrg([
  {
    "@type": "WebPage",
    name: t("about.title"),
    description: t("about.description"),
    dateModified: new Date().toISOString(),
  },
]);

const isMobile = useMobile();
const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 768;
};

const contInfo = ["contact@baderidris.com", "+970595744368"];
const showIcon = ref([false, false]);

const openMailTo = (index: number) => {
  if (import.meta.client) window.location.href = `mailto:${contInfo[index]}`;
};

const copyToClipboard = async (index: number) => {
  if (!import.meta.client) return;
  try {
    await navigator.clipboard.writeText(contInfo[index]);
    showIcon.value[index] = true;
    setTimeout(() => {
      showIcon.value[index] = false;
    }, 1000);
  } catch (e) {
    console.error(e);
  }
};

const icons = useState("aboutIcons", () => [
  { iconSrc: "/imgs/svgs/shell.svg", iconAlt: "shell", path: "professional" },
  { iconSrc: "/imgs/svgs/circle.svg", iconAlt: "circle", path: "hobbies/bio" },
  { iconSrc: "/imgs/svgs/game.svg", iconAlt: "game", path: "hobbies" },
]);

const hobbiesObj = useState("aboutHobbies", () => [
  { title: "bio", icon: "/imgs/svgs/red-dir.svg", iconAlt: "red folder", path: "bio" },
  {
    title: "interests",
    icon: "/imgs/svgs/green-dir.svg",
    iconAlt: "green folder",
    path: "interests",
  },
  {
    title: "education",
    icon: "/imgs/svgs/purple-dir.svg",
    iconAlt: "purple folder",
    path: "education",
  },
  {
    title: "high-school",
    icon: "/imgs/svgs/md-icon.svg",
    iconAlt: "markdown icon",
    path: "high-school",
  },
  {
    title: "University",
    icon: "/imgs/svgs/md-icon.svg",
    iconAlt: "markdown icon",
    path: "university",
  },
]);

const config = useRuntimeConfig();

if (import.meta.server) {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const sharp = (await import("sharp")).default;

  const processIcon = async (iconPath: string) => {
    const inputPath = path.join(process.cwd(), "public", iconPath);
    const outputPath = inputPath.replace(".svg", ".webp");
    const webpPath = iconPath.replace(".svg", ".webp");

    if (fs.existsSync(inputPath)) {
      if (!fs.existsSync(outputPath)) {
        try {
          await sharp(inputPath).webp({ quality: 80 }).toFile(outputPath);
          console.log(`[about.vue] WebP generated: ${webpPath}`);
        } catch (error) {
          console.error(`[about.vue] Sharp error for ${iconPath}:`, error);
          return `${config.public.originUrl}${iconPath}`;
        }
      }
      return `${config.public.originUrl}${webpPath}`;
    }
    return `${config.public.originUrl}${iconPath}`;
  };

  for (const icon of icons.value) {
    icon.iconSrc = await processIcon(icon.iconSrc);
  }

  for (const hobby of hobbiesObj.value) {
    hobby.icon = await processIcon(hobby.icon);
  }
}

const toggleHobbies = () => {
  isHobbiesHidden.value = !isHobbiesHidden.value;
};
const toggleContact = () => {
  isContactHidden.value = !isContactHidden.value;
};
const setActiveHobby = (index: number) => {
  activeHobbyIndex.value = index;
  const hobby = hobbiesObj.value[index];
  if (hobby && hobby.path) {
    navigateTo(localePath(`/about/hobbies/${hobby.path}`));
  }
};

const setActiveIcon = (index: number) => {
  navigateTo(localePath(`/about/${icons.value[index].path}`));
};

const syncActiveIcon = (path: string) => {
  const segment = path.split("/").filter(Boolean).at(-1) ?? "";
  const index = icons.value.findIndex((icon) => icon.path === segment);
  if (index !== -1) activeIconIndex.value = index;
};

const displayContactInfo = computed(() => {
  return isMobile.value
    ? contInfo
    : [contInfo[0].slice(0, -10) + " ...", contInfo[1]];
});

onMounted(() => {
  syncActiveIcon(route.path);
  checkScreenSize();
  window.addEventListener("resize", checkScreenSize);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkScreenSize);
});
</script>

<style lang="scss" scoped>
.about-page {
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

.about-body {
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
  overflow-y: auto;
  display: flex;
  flex-direction: row; //activity bar + explorer
  transition: width 0.1s ease-out;

  &.is-resizing {
    transition: none;
    user-select: none;
  }

  @include mobile {
    width: 100% !important;
    flex-direction: column;
    border-right: none;
    border-bottom: 1px solid $lines;
    flex-shrink: 0;
    max-height: 50vh;
  }
}

.activity-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 60px;
  flex-shrink: 0;
  border-right: 1px solid $lines;
  padding-top: 10px;

  @include mobile {
    display: none;
  }

  img {
    margin: 15px 0;
    cursor: pointer;
    width: 24px;
    opacity: 0.4;
    @include transition-ease;
    
    &:hover,
    &.active {
      filter: brightness(4);
      opacity: 1;
    }
  }
}

.explorer-lists {
  flex: 1;
  overflow-y: auto;
  
  .hobbies-bar {
    padding: 10px 0 10px 20px;
    
    p {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 0;
      cursor: pointer;
      color: $secondary1;
      @include transition-ease;
      
      &:hover, &.active {
        color: $secondary4;
      }
    }
  }

  .personal-contact {
    padding: 10px 0 10px 20px;
    
    p {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 0;
      cursor: pointer;
      color: $secondary1;
      @include transition-ease;
      
      &:hover {
        color: $secondary4;
      }
    }
  }
}

.about-main-content {
  flex: 1;
  overflow: hidden;
  background-color: $primary2;
  position: relative;
}
</style>