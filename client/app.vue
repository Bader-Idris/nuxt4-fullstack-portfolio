<template>
  <!-- <NuxtPwaAssets /> or -->
  <!-- <NuxtPwaManifest /> -->
  <!-- <NuxtLoadingIndicator> -->
  <NuxtLayout>
    <NuxtPage v-slot="{ Component }">
      <Transition
        :name="isFirstLoad ? '' : 'fade'"
        mode="out-in"
        @before-enter="handleBeforeEnter">
        <component :is="Component" :key="$route.fullPath" />
      </Transition>
    </NuxtPage>
  </NuxtLayout>
</template>

<script setup lang="ts">


useHead({
  // link: []
  // bodyAttrs: {
  //   class: 'test'
  // },
  // script: [{ innerHTML: 'console.log(\'Hello world\')' }]
})

const isFirstLoad = ref(true);
const handleBeforeEnter = () => {
  if (isFirstLoad.value) {
    isFirstLoad.value = false;
  }
};

onMounted(() => {
  // Initial page load transition handling
  isFirstLoad.value = false;
});

if (import.meta.client) {
  console.log(
    '%cWelcome to my %cfull-stack %capp',
    'color: #fb853b; font-weight: bold; font-family: "Fira Code"; font-size: 30px;',
    'color: #3c9d93; font-weight: bold; font-family: "Fira Code"; font-size: 32px;',
    'color: #fb853b; font-weight: bold; font-family: "Fira Code"; font-size: 30px;'
  );
}

</script>

<style lang="scss">

:root {
  height: 100vh;
  width: 100vw;
}

body {
  background-color: $primary1;
  color: $secondary1;
}

// #app { // if you wanna change it, change app.rootId in the nuxt.config.ts file
#__nuxt {
  margin: 30px;

  @media (max-width: 768px) {
    margin: 15px;
  }
}

.title {
  font-family: $main-font;
}

.container {
  background-color: $primary1;
  color: white;
}

/* Transition for router-view */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
