<template>
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
  initiallyFolded?: boolean; // Optional prop to set initial folded state
}>();
const emit = defineEmits(["toggle"]);
const isToggled = ref(props.initiallyFolded || false); // Initialize based on prop
const toggleFolding = () => {
  isToggled.value = !isToggled.value;
  emit("toggle");
};
// Watch for changes in the initiallyFolded prop to update the toggled state
watch(
  () => props.initiallyFolded,
  (newVal) => {
    isToggled.value = newVal || false;
  },
);
</script>

<style lang="scss" scoped>
.nav-titled {
  width: 100%;
  color: $secondary4;
  position: relative;
}

.foldable-tab {
  @include flex-container(row, nowrap, unset, baseline);
  padding-left: 10px;
  user-select: none;
  border-bottom: 1px solid $lines;
  height: 35px;
  align-items: center;

  @include mobile {
    background-color: $lines;
    height: 30px;
    width: 100%;
  }

  > svg {
    transform: rotate(180deg);
    transition: transform 0.3s ease-in-out;
    padding: 2px;
    margin: 0px 5px 0;
  }
}

.foldable-tab.is-folded > svg {
  transform: rotate(90deg);
}
</style>