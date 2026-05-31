<template>
  <FoldableTab :initially-folded="initiallyFolded" @toggle="toggleSidebar">
    <p>projects</p>
  </FoldableTab>
</template>

<script setup lang="ts">
const props = defineProps<{
  initiallyFolded?: boolean;
}>();
const emit = defineEmits(["toggle-sidebar"]);
const toggleSidebar = () => {
  emit("toggle-sidebar");
};
</script>

<style lang="scss" scoped></style>
