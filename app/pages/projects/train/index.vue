<template>
  <div class="train-page" :class="{ 'page-fullscreen': isFullscreen }">
    <ClientOnly>
      <ThreeLocomotive v-model:fullscreen="isFullscreen" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const runtimeConfig = useRuntimeConfig();

const trainTitle = "3D Train Locomotive Project";
const trainDescription =
  "Interactive 3D train locomotive scene built with Nuxt 4, Three.js, custom GLSL smoke particles, and a procedural sky shader.";
const trainSeoImage = `${runtimeConfig.public.originUrl}/imgs/train-thumbnail-2026-05-5.webp`;

useSeoMeta({
  title: trainTitle,
  description: trainDescription,
  ogTitle: trainTitle,
  ogDescription: trainDescription,
  ogImage: trainSeoImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogType: "article",
  twitterCard: "summary_large_image",
  twitterTitle: trainTitle,
  twitterDescription: trainDescription,
  twitterImage: trainSeoImage,
});

useSchemaOrg([
  defineArticle({
    headline: trainTitle,
    description: trainDescription,
    image: trainSeoImage,
    datePublished: "2026-04-13",
    author: [{ name: "Bader Idris", url: "https://baderidris.com" }],
  }),
]);

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