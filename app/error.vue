<script setup lang="ts">
import type { NuxtError } from "#app";
const localePath = useLocalePath();
const { t } = useI18n();

const props = defineProps({
  error: {
    type: Object as () => NuxtError,
    default: () => ({ statusCode: 404 }),
  },
});

// AI & SEO: Ensure error pages (especially 404s) return clear signals to crawlers.
// This prevents AI from indexing broken links and provides a semantic title.
useSeoMeta({
  title: () => `${props.error?.statusCode || 404} - ${t("blog.notFound", "Page Not Found")}`,
  robots: "noindex, nofollow",
});
</script>

<template>
  <NavBar />
  <div class="not-found">
    <h1 class="text">{{ error?.statusCode || 404 }}</h1>
    <p>
      This page is not found <strong>{{ useRequestURL().pathname }}</strong>
    </p>
    <CustomLink
      aria-label="go to main page"
      :to="localePath('/')"
      class="go-back"
    >
      <span> back to main page </span>
    </CustomLink>
  </div>
  <FooterComp />
</template>

<style lang="scss" scoped>
.not-found {
  @include flex-container(column, wrap, center, center);
  @include mainMiddleSettings;

  @include mobile {
    @include phone-borders;
  }

  .text {
    font-size: calc($headline-size * 2);
    text-align: center;
    margin: 20px 0;
  }

  p:last-child {
    font-size: $body-text-size;
  }

  .go-back {
    color: $primary1;
    text-decoration: none;
    text-align: center;

    span {
      color: $secondary3;
      text-transform: capitalize;
      font-size: $body-text-size;
    }
  }
}
</style>