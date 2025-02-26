<template>
  <span id="line" />
  <div class="nav-titled">
    <div
      class="foldable-tab"
      :class="{ 'is-folded': isToggled }"
      @click="toggleFolding"
    >
      <span class="fas fa-triangle" />
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  initiallyFolded?: boolean // Optional prop to set initial folded state
}>()
const emit = defineEmits(['toggle'])
const isToggled = ref(props.initiallyFolded || false) // Initialize based on prop
const toggleFolding = () => {
  isToggled.value = !isToggled.value
  emit('toggle')
}
// Watch for changes in the initiallyFolded prop to update the toggled state
watch(
  () => props.initiallyFolded,
  (newVal) => {
    isToggled.value = newVal || false
  },
)
</script>

<style lang="scss" scoped>
// @use '~' as *;

.nav-titled {
  width: 301px;
  color: $secondary4;
  position: relative;

  #line {
    position: relative;
    user-select: none;
    font-family: $main-font;
    font-weight: bold;
    letter-spacing: 0.7px;
  }
}

@media (min-width: 769px) {
  #line {
    width: 1px;
    top: 30px;
    left: 331px;
    position: fixed;
    display: inline-block;
    background: $lines;
    height: calc(100vh - 80px);
  }
}

.foldable-tab {
  display: flex;
  align-items: baseline;
  padding-left: 10px;
  user-select: none;

  @media (max-width: 768px) {
    background-color: $lines;
    height: 30px;
    align-items: center;
    width: calc(100vw - 30px);
  }

  > span {
    transform: rotate(180deg);
    transition: transform 0.3s ease-in-out;
    font-size: 10px;
    padding: 15px 10px;
  }
}

.foldable-tab.is-folded > span {
  transform: rotate(90deg);
}
</style>
