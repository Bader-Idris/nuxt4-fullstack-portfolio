<template>
  <div class="train-page" :class="{ 'page-fullscreen': isFullscreen }">
    <ClientOnly>
      <ThreeLocomotive v-model:fullscreen="isFullscreen" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { t } = useI18n();
const runtimeConfig = useRuntimeConfig();

const trainTitle = computed(() => t("projects.train.title"));
const trainDescription = computed(() => t("projects.train.description"));
const trainSeoImage = `${runtimeConfig.public.originUrl}/imgs/train-thumbnail-2026-05-5.webp`;

useSeoMeta({
  title: () => trainTitle.value,
  description: () => trainDescription.value,
  ogTitle: () => trainTitle.value,
  ogDescription: () => trainDescription.value,
  ogUrl: `${runtimeConfig.public.originUrl}${useLocalePath()(route.path)}`,
  ogImage: trainSeoImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogType: "article",
  twitterCard: "summary_large_image",
  twitterTitle: () => trainTitle.value,
  twitterDescription: () => trainDescription.value,
  twitterImage: trainSeoImage,
});

if (import.meta.server) {
  useSchemaOrg([
    defineArticle({
      headline: () => trainTitle.value,
      description: () => trainDescription.value,
      image: trainSeoImage,
      datePublished: "2026-04-13",
      author: [{ name: "Bader Idris", url: "https://baderidris.com" }],
    }),
  ]);
}

// Initialize from URL on client to avoid hydration mismatch
const isFullscreen = ref(false);

/*
// Example of how you can extend the Terrain class:
import { Terrain } from '@/composables/threeD/useTerrain'
class CustomTerrain extends Terrain {
  constructor(scene: any, world?: any, rapier?: any) {
    super(scene, world, rapier)
    this.maxHeight = 8 // Modify properties
  }
  // Override methods for custom behavior
  async loadFromHeightmap(url: string) {
    console.log("Loading custom terrain...")
    await super.loadFromHeightmap(url)
  }
}
*/

onMounted(() => {
  isFullscreen.value = route.query.fullscreen === "true";
  // Only set hideLayout on client (after hydration)
  route.meta.hideLayout = isFullscreen.value;
});

// Hide layout when fullscreen toggled
watch(isFullscreen, (val) => {
  route.meta.hideLayout = val;
});
</script>

<style lang="scss" scoped>
.train-page {
  @include mainMiddleSettings;

  @include mobile {
    // overflow-y: hidden;
    margin-right: 0;
    padding: 0 0 10dvh 0;

    @include phone-borders;
  }

  &.page-fullscreen {
    width: 100dvw;
    height: 100dvh;
    padding: 0;
    margin: 0;
    overflow: hidden;
  }
}
</style>