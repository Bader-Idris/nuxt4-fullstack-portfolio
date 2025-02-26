<template>
  <div class="professional-info">
    <h1>professional nested Page</h1>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Projects I created during my career',
  meta: [
    { name: 'description', content: 'Explore projects by Bader Idris, showcasing expertise in responsive web design, e-commerce, multi-step forms, todo apps, and stunning agency web apps. Powered by Vue.js, TypeScript, Node.js, and more.' },
  ],
})

// definePageMeta({
//   layout: 'about', // Specify the layout
// });
</script>

<style lang="scss" scoped>
.professional-info {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
