<template>
  <span id="line" />
  <div class="nav-titled">
    <div
      class="foldable-tab"
      :class="{ 'is-folded': isToggled }"
      @click="toggleFolding"
    >
      <Icon name="bxs:up-arrow" width="20" mode="svg" />
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
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

@include tablet-to-up {
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

  @include mobile {
    background-color: $lines;
    height: 30px;
    align-items: center;
    width: calc(100vw - 30px);
  }

  > svg {
    transform: rotate(180deg);
    transition: transform 0.3s ease-in-out;
    padding: 2px;
    margin: 0px 5px 0;
    @include tablet-to-up {
      position: relative;
      top: 4px;
    }
  }
}

.foldable-tab.is-folded > svg {
  transform: rotate(90deg);
}
</style>
