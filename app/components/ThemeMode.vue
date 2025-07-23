<script setup>
import { useColorMode } from '@vueuse/core'

const colorMode = useColorMode()

const modes = [
  { value: 'system', icon: 'material-symbols:autorenew', label: 'System' },
  { value: 'light', icon: 'i-lucide-sun', label: 'Light' },
  { value: 'dark', icon: 'i-lucide-moon', label: 'Dark' }
]

const isOpen = ref(false)
const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectMode = (mode) => {
  colorMode.value = mode
  isOpen.value = false
}
</script>

<template>
  <div class="color-mode-selector">
    <!-- Current selection button -->
    <button
      class="theme-toggle-btn"
      @click="toggleDropdown"
    >
      <Icon :name="modes.find(m => m.value === colorMode)?.icon" class="icon" />
      <span class="label">{{modes.find(m => m.value === colorMode)?.label
        }}</span>
      <Icon name="i-lucide-chevron-down" class="chevron-icon" />
    </button>

    <!-- Dropdown menu -->
    <div v-if="isOpen" class="dropdown-menu">
      <button
        v-for="mode in modes" 
        :key="mode.value"
        :class="{ 'active': colorMode === mode.value }"
        class="dropdown-item"
        @click="selectMode(mode.value)" 
      >
        <Icon :name="mode.icon" class="icon" />
        <span class="label">{{ mode.label }}</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.color-mode-selector {
  position: relative;
  font-family: $main-font;
  width: 150px;
  z-index: z("header");
  position: relative;
  right: -30px;
}

.theme-toggle-btn {
  @include flex-container(row, nowrap, unset, center);
  gap: 8px;
  padding: 8px 12px;
  width: 100%;
  border: 1px solid $lines;
  border-radius: 8px;
  background-color: $btn2-bg;
  color: $btn2-clr;
  font-size: $labels-size;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;

  &:hover {
    background-color: $primary1-hovered;
    border-color: $accent1;
  }

  .icon {
    font-size: 18px;
  }

  .label {
    flex: 1;
    text-align: left;
  }

  .chevron-icon {
    font-size: 14px;
  }
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  width: 100%;
  background-color: $primary2;
  border: 1px solid $lines;
  border-radius: 8px;
  overflow: hidden;
  z-index: z("content");
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dropdown-item {
  @include flex-container(row, nowrap, unset, center);
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background-color: transparent;
  color: $secondary4;
  border: none;
  text-align: left;
  font-size: $labels-size;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: $primary1-hovered;
  }

  &.active {
    background-color: $primary1-hovered;
    color: $accent1;
  }

  .icon {
    font-size: 18px;
  }
}

// Dark mode specific styles
:global(.dark) {
  .theme-toggle-btn {
    background-color: $primary2;
  }

  .dropdown-menu {
    background-color: $primary1;
  }
}
</style>