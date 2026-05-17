<template>
  <div class="language-switcher">
    <select
      v-model="selectedLocale"
      aria-label="Select language"
      @change="handleLocaleChange"
    >
      <option
        v-for="localeItem in allLocales"
        :key="localeItem.code"
        :value="localeItem.code"
        :disabled="localeItem.code === (locale as any).value"
      >
        {{ getFlagEmoji(localeItem.iso as string) }} {{ localeItem.name }}
        {{ localeItem.code === (locale as any).value ? " (current)" : "" }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
const { locale, locales } = useI18n();
const switchLocalePath = useSwitchLocalePath();

// Get region code from ISO (e.g., 'en-US' -> 'US')
const getRegionCode = (iso?: string) => {
  if (!iso) return "";
  const parts = iso.split("-");
  return parts.length > 1 ? parts[1] : parts[0]; // Fallback to the full code if no region is found
};

// Generate flag emoji from ISO code, with safety check for undefined/empty strings
const getFlagEmoji = (iso?: string) => {
  const regionCode = getRegionCode(iso);
  if (!regionCode) return ""; // Return empty string if no region code is found
  return String.fromCodePoint(
    ...[...regionCode.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)),
  );
};

// All locales for the dropdown
const allLocales = computed(() => {
  return locales.value;
});

// Initialize with current locale
const selectedLocale = ref((locale as any).value);

// Use useLocaleHead for robust SEO attributes (hreflang, link tags)
// We keep this to avoid hydration/prerender issues with link tags
const i18nHead = useLocaleHead({
  dir: false, // Prevents global RTL, matching our manual CSS approach
  seo: true,
});

// Use useHead with manual htmlAttrs to match previous behavior and avoid global RTL side effects
useHead({
  htmlAttrs: {
    lang: computed(() => (locale as any).value),
  },
  link: i18nHead.value.link,
  meta: i18nHead.value.meta,
});

// Watch for locale changes and update the selected locale
watch(
  locale,
  (newLocale) => {
    if (newLocale) {
      selectedLocale.value = (newLocale as any).value || newLocale;
    }
  },
  { immediate: true },
);

// Handle locale change by navigating to the new locale path
const handleLocaleChange = () => {
  if (selectedLocale.value !== locale.value) {
    const newPath = switchLocalePath(selectedLocale.value);
    // Use navigateTo for proper navigation that preserves SEO
    navigateTo(newPath);
  }
};
</script>

<style lang="scss" scoped>
.language-switcher {
  z-index: z("modal-backdrop");
  @include mobile {
    right: 60px;
    position: absolute;
  }
  @include tablet-to-up {
    right: 180px;
    position: absolute;
  }
  > select {
    width: 100px;
    background-color: #333;
    color: #fff;
    width: 30px;
    font-weight: bold;
    border: none;
    border-radius: 4px;
    padding: 8px;
    font-size: 14px;
    appearance: none;
    background-image: linear-gradient(to right, #ff7e5f, $accent1);
    cursor: pointer;
    option {
      background-color: #333;
      color: #fff;
    }
  }
  input {
    width: 200px;
    padding: 8px;
    font-size: 14px;
  }
}

html[lang="ar-PS"] {
  @include tablet-to-up {
    .language-switcher {
      right: 125px;
    }
  }
}
html[lang="es-ES"] {
  @include tablet-to-up {
    .language-switcher {
      right: 160px;
    }
  }
}
</style>