<template>
  <div ref="switcherRef" class="language-switcher">
    <button
      class="switcher-trigger"
      aria-label="Toggle language menu"
      @click="isOpen = !isOpen"
    >
      <Icon
        :name="`circle-flags:${currentRegionCode.toLowerCase()}`"
        size="20"
      />
    </button>

    <Transition name="fade">
      <div v-if="isOpen" class="language-menu">
        <button
          v-for="localeItem in allLocales"
          :key="localeItem.code"
          class="menu-item"
          :class="{ active: localeItem.code === locale }"
          :disabled="localeItem.code === locale"
          @click="handleLocaleChange(localeItem.code)"
        >
          <Icon
            :name="`circle-flags:${getRegionCode(localeItem.iso).toLowerCase()}`"
            size="18"
          />
          <span class="locale-name">{{ localeItem.name }}</span>
          <Icon
            v-if="localeItem.code === locale"
            name="mdi:check"
            size="14"
            class="active-check"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";

const { locale, locales } = useI18n();
const switchLocalePath = useSwitchLocalePath();

const switcherRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

onClickOutside(switcherRef as any, () => {
  isOpen.value = false;
});

// Get region code from ISO (e.g., 'en-US' -> 'US')
const getRegionCode = (iso?: string): string => {
  if (!iso) return "un"; // 'un' for unknown flag
  const parts = iso.split("-");
  return parts.length > 1 ? parts[1]! : parts[0]!;
};

const currentRegionCode = computed((): string => {
  const currentLocale = (locales.value as any[]).find(
    (l) => l.code === locale.value,
  );
  return getRegionCode(currentLocale?.iso as string | undefined);
});

// All locales for the dropdown
const allLocales = computed(() => {
  return locales.value as any[];
});

// Handle locale change
const handleLocaleChange = (newLocale: string) => {
  if (newLocale !== locale.value) {
    const newPath = switchLocalePath(newLocale as any);
    if (newPath) {
      navigateTo(newPath);
    }
    isOpen.value = false;
  }
};

const i18nHead = useLocaleHead({
  dir: false, // Prevents global RTL, matching our manual CSS approach
  seo: true,
});

useHead({
  htmlAttrs: {
    lang: locale,
  },
  link: i18nHead.value.link,
  meta: i18nHead.value.meta,
});
</script>

<style lang="scss" scoped>
.language-switcher {
  z-index: z("modal-backdrop");
  position: absolute;

  @include mobile {
    right: 60px;
  }
  @include tablet-to-up {
    right: 180px;
  }
}

.switcher-trigger {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: linear-gradient(to right, #ff7e5f, $accent1);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  &:hover {
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
}

.language-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 140px;
  background-color: #222;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #eee;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  &:disabled {
    cursor: default;
    opacity: 0.8;
  }

  &.active {
    background: rgba($accent1, 0.2);
    color: $accent1;
    font-weight: bold;
  }

  .locale-name {
    flex: 1;
  }

  .active-check {
    color: $accent1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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