<template>
  <div class="train-page" :class="{ 'page-fullscreen': isFullscreen }">
    <ThreeLocomotive v-model:fullscreen="isFullscreen" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const runtimeConfig = useRuntimeConfig();

const trainTitle = "3D Train Locomotive Project";
const trainDescription =
  "Interactive 3D train locomotive scene built with Nuxt 4, Three.js, custom GLSL smoke particles, and a procedural sky shader.";
const trainSeoImage = `${runtimeConfig.public.originUrl}/imgs/train-thumbnail-2026-04-13.png`;

useSeoMeta({
  title: trainTitle,
  description: trainDescription,
  ogTitle: trainTitle,
  ogDescription: trainDescription,
  ogImage: trainSeoImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
});

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
    @include phone-borders;
  }

  @include mobile {
    overflow-y: scroll;
    padding-bottom: 10vh;
  }

  &.page-fullscreen {
    width: 100vw;
    height: 100vh;
    padding: 0;
    margin: 0;
    overflow: hidden;
  }
}
</style>
