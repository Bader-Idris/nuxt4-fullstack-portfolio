<template>
  <div class="professional-info">
    <h1>professional page is under construction</h1>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

useSeoMeta({
  title: t("about.professional.title"),
  description: t("about.professional.description"),
});

if (import.meta.server) {
  useSchemaOrg([
    defineWebPage({
      name: t("about.professional.title"),
      description: t("about.professional.description"),
    }),
  ]);
}
</script>

<style lang="scss" scoped>
.professional-info {
  @include flex-container(row, nowrap, center, center);
  width: 100%;
  height: 100%;
  color: $secondary4;
  padding: 40px;
  overflow-y: auto;

  @include mobile {
    padding: 20px 15px;
  }
}
</style>