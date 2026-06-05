<template>
  <div class="hobbies-index">
    <!-- <h1>Basic Three.js Cube </h1> -->
    <ThreeCanvas />
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Hobbies",
  description: "Hobbies and interests of Bader Idris.",
});

if (import.meta.server) {
  useSchemaOrg([
    defineWebPage({
      name: 'Hobbies',
      description: "Hobbies and interests of Bader Idris.",
    }),
    defineWebSite({
      name: 'Bader Idris Portfolio',
      url: 'https://baderidris.com'
    })
  ]);
}
</script>

<style lang="scss" scoped>
.hobbies-index {
  @include flex-container(row, nowrap, center, center);
  width: 100%;
  height: 100%;
}
</style>
