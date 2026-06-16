<template>
  <div class="blog-wrapper">
    <!-- This serves as the parent wrapper for all /blog/... routes -->
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
// Shared blog-wide logic or SEO can go here.
// Child pages will render inside the <NuxtPage /> above.

// import { useUserStore } from "~/stores/useUserSocket";
// const userStore = useUserStore();
const { t, locale } = useI18n();
const localePath = useLocalePath();
const config = useRuntimeConfig();
const route = useRoute();

const fullPathWithLocale = computed(() => localePath(route.path));

if (import.meta.server) {
  useSeoMeta({
    title: t("blog.title"),
    ogTitle: t("blog.title"),
    description: t("blog.description"),
    ogDescription: t("blog.description"),
    ogUrl: `${config.public.siteUrl}${fullPathWithLocale.value}`,
  });

  defineOgImage("Default.takumi", {
    title: t("blog.title"),
    description: t("blog.description"),
    language: locale.value,
  });
}

</script>

<style lang="scss" scoped>
.blog-wrapper {
  // Use the standard layout mixin for consistency across the blog section
  @include mainMiddleSettings;
  height: calc(#{$full-viewport-height} - 87px);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @include mobile {
    @include phone-borders;
    height: calc(#{$full-viewport-height} - 90px);
  }
}
</style>
