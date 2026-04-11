<template>
  <div class="train-page" :class="{ 'page-fullscreen': isFullscreen }">
    <ThreeLocomotive v-model:fullscreen="isFullscreen" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

// Initialize from URL on client to avoid hydration mismatch
const isFullscreen = ref(false)

onMounted(() => {
  isFullscreen.value = route.query.fullscreen === 'true'
  // Only set hideLayout on client (after hydration)
  route.meta.hideLayout = isFullscreen.value
})

// Hide layout when fullscreen toggled
watch(isFullscreen, (val) => {
  route.meta.hideLayout = val
})
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