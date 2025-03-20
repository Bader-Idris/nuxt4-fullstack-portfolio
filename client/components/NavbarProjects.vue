<template>
  <FoldableTab @toggle="toggleSidebar">
    <p>projects</p>
  </FoldableTab>
</template>

<script setup lang="ts">
const emit = defineEmits(['toggle-sidebar'])
const toggleSidebar = () => {
  emit('toggle-sidebar')
}
</script>

<style lang="scss" scoped>
</style>
