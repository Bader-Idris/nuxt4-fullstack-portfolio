<template>
  <div class="hobbies-index">
    <!-- <h1>Basic Three.js Cube </h1> -->
    <ThreeCanvas />
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "under development hobbies nested page",
  description: "this page requires fixes, so please stay tuned",
});

useSchemaOrg({
  "@type": "AboutPage", // or "WebPage"
  name: "Hobbies",
  description: "Hobbies and interests of Bader Idris.",
});
</script>

<style lang="scss" scoped>
.hobbies-index {
  @include flex-container(row, nowrap, center, center);
  width: 100%;
  height: 100%;
}
</style>
