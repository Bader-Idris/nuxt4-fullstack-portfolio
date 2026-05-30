<template>
  <div>
    <NavBar v-if="!hideLayout" />
    <!-- <div>
      <div>Full path: {{  route.fullPath }}</div>
      <div>Params: {{  route.params }}</div>
      <div>Page Name: {{  route.name }}</div>
    </div> -->
    <main>
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
</style>