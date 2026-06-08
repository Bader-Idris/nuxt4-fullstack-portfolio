<template>
  <div class="hobbies-index">
    <!-- <h1>Basic Three.js Cube </h1> -->
    <ThreeCanvas />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

useSeoMeta({
  title: t("about.hobbies.title"),
  description: t("about.hobbies.description"),
});

if (import.meta.server) {
  useSchemaOrg([
    defineWebPage({
      name: t("about.hobbies.title"),
      description: t("about.hobbies.description"),
    }),
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
