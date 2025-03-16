<template>
  <div class="language-switcher">
    <select
      v-model="selectedLocale"
      aria-label="Select language"
      @change="handleLocaleChange"
    >
      <option
        v-for="locale in locales"
        :key="locale.code"
        :value="locale.code"
      >
        {{ getFlagEmoji(locale.iso) }} {{ locale.name }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '#imports' // Nuxt 3's useHead composable

const { locale, locales, setLocale } = useI18n()

// Get region code from ISO (e.g., 'en-US' -> 'US')
const getRegionCode = (iso: string) => {
  const parts = iso.split('-')
  return parts.length > 1 ? parts[1] : parts[0] // Fallback to the full code if no region is found
}

const getFlagEmoji = (iso: string) => {
  const regionCode = getRegionCode(iso)
  if (!regionCode) return '' // Return empty string if no region code is found
  return String.fromCodePoint(...[...regionCode.toUpperCase()].map(c => 0x1F1A5 + c.charCodeAt(0)))
}

// Initialize with current locale
const selectedLocale = ref(locale.value)

// Reactive HTML lang attribute
const htmlAttrs = ref({
  lang: selectedLocale.value,
})

// Use useHead with a reactive object
useHead({
  htmlAttrs: htmlAttrs.value,
})

// Watch for locale changes and update the HTML lang attribute
watch(selectedLocale, (newLocale) => {
  if (newLocale) {
    htmlAttrs.value.lang = newLocale
  }
})

// Handle locale change
const handleLocaleChange = () => {
  setLocale(selectedLocale.value)
}
</script>

<style lang="scss" scoped>
.language-switcher {
  z-index: 999;
  @media screen and (max-width: 768px) {
    right: 60px;
    position: absolute;
  }
  @media screen and (min-width: 769px) {
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

html[lang="ar"] {
  .language-switcher {
    right: 125px
  }
}
</style>
