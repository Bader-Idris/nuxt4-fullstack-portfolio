<script lang="ts">
// Client-side only imports to prevent SSR issues
import { Capacitor } from "@capacitor/core";

export default {
  inheritAttrs: false,
};
</script>

<template>
  <!-- External link on mobile devices (uses Capacitor in-app browser) -->
  <a
    v-if="isExternalLink && isMobile"
    class="external-link"
    :href="String(to)"
    @click.prevent="openInAppBrowser"
  >
    <slot />
  </a>

  <!-- External link for non-mobile devices (opens in a new tab) -->
  <a
    v-else-if="isExternalLink"
    v-bind="$attrs"
    class="external-link"
    :href="String(to)"
    target="_blank"
    rel="noopener noreferrer"
    @click="handleExternalClick"
  >
    <slot />
  </a>

  <!-- Internal link using NuxtLink -->
  <NuxtLink
    v-else
    v-slot="{ href, navigate, isExactActive }"
    v-bind="$props"
    :to="localePath(to)"
    custom
  >
    <a
      v-bind="$attrs"
      class="internal-link"
      :href="href"
      :class="isExactActive ? '' : inactiveClass"
      @click="navigate"
    >
      <slot />
    </a>
  </NuxtLink>
</template>

<script lang="ts" setup>
// To ensure attributes are not inherited by default
defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  to: {
    type: [String, Object],
    required: true,
  },
  inactiveClass: {
    type: String,
    default: "inactive",
  },
});

const localePath = useLocalePath();

const isExternalLink = computed(() => {
  return typeof props.to === "string" && props.to.startsWith("http");
});

// Only check for mobile on client-side
const isMobile = computed(() => {
  return import.meta.client && Capacitor.isNativePlatform();
});

// Open the link in the in-app browser for mobile devices
const openInAppBrowser = async () => {
  if (import.meta.client && typeof props.to === "string") {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({
      url: props.to,
      toolbarColor: "#4d5bce",
      presentationStyle: "popover", // This keeps the user in your app context
    });
  }
};

const handleExternalClick = (event: MouseEvent) => {
  // Always stop propagation to prevent parent components (like FooterComp.vue)
  // from triggering a second window.open call.
  event.stopPropagation();
};
</script>