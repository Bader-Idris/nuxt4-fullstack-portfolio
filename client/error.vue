<script setup lang="ts">
import type { NuxtError } from '#app'
import { useLocalePath } from '#imports'
const localePath = useLocalePath()

defineProps({
  error: Object as () => NuxtError
})
</script>

<template>
  <NavBar />
  <div class="not-found">
    <h1 class="text">{{ error?.statusCode || 404 }}</h1>
    <p>This page is not found <strong>{{ useRequestURL().pathname }}</strong></p>
    <CustomLink aria-label="go to main page" :to="localePath('/')"
      class="go-back">
      <span> back to main page </span>
    </CustomLink>
  </div>
  <FooterComp />
</template>


<style lang="scss" scoped>

.not-found {
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  @include mainMiddleSettings;

  @media (max-width: 768px) {
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
