<template>
  <div class="layout-wrapper">
    <NavBar v-if="!hideLayout" />
    <!-- <div>
      <div>Full path: {{  route.fullPath }}</div>
      <div>Params: {{  route.params }}</div>
      <div>Page Name: {{  route.name }}</div>
    </div> -->
    <main class="main-content">
      <slot />
    </main>
    <FooterComp v-if="!hideLayout" />
  </div>
</template>

<script setup>
const route = useRoute();
const hideLayout = computed(() => route.meta.hideLayout || false);
</script>

<style lang="scss">
/* Add any global styles you need here */
.layout-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0; // Allow flex children to shrink if needed

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden; // Ensure children handle their own scrolling
  }
}
</style>