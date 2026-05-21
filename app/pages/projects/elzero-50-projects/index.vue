<template>
  <div class="elzero-50-projects">
    testing
  </div>
</template>

<script setup lang="ts">
  
</script>

<style lang="scss" scoped>
.elzero-50-projects {
  @include mainMiddleSettings;

  @include mobile {
    // overflow-y: hidden;
    margin-right: 0;
    padding: 0 0 10dvh 0;

    @include phone-borders;
  }
}
</style>