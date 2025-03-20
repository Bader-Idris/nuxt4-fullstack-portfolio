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
import { useI18n } from 'vue-i18n'

useHead({
  // link: []
  // bodyAttrs: {
  //   class: 'test'
  // },
  // script: [{ innerHTML: 'console.log(\'Hello world\')' }]
})

const { t } = useI18n({ useScope: 'global' })
const isFirstLoad = ref(true);
const isCapacitorDevice = ref(false)
const handleBeforeEnter = () => {
  if (isFirstLoad.value) {
    isFirstLoad.value = false;
  }
};

// Initialize Capacitor functionality
const initCapacitor = async () => {
  try {
    // Check if running in Capacitor environment
    const { Device } = await import('@capacitor/device')
    const info = await Device.getInfo()
    isCapacitorDevice.value = info.platform !== 'web'

    if (isCapacitorDevice.value) {
      // Set up network monitoring
      const { Network } = await import('@capacitor/network')

      Network.addListener('networkStatusChange', async (status) => {
        if (!status.connected) {
          await notifyOffline()
        }
      })

      // Initial offline check on startup
      const status = await Network.getStatus()
      if (!status.connected) {
        await notifyOffline()
      }
    }
  } catch (error) {
    console.error('Error initializing Capacitor:', error)
    isCapacitorDevice.value = false
  }
}

async function notifyOffline() {
  if (isCapacitorDevice.value) {
    const { Toast } = await import('@capacitor/toast')
    await Toast.show({
      text: t("messages.NetworkStatus.offline"),
      duration: 'long',
      position: 'bottom'
    })
  }
}

onMounted(async () => {
  // Initial page load transition handling, for SEO
  isFirstLoad.value = false;

  if (import.meta.client) {
    await initCapacitor()
    if (process.env.NUXT_SSR === 'false') {
      try {
        const { StatusBar } = await import('@capacitor/status-bar');

        // Configure StatusBar without overriding it
        StatusBar.setOverlaysWebView({ overlay: false });
        StatusBar.setStyle({ style: 'DARK' });
        StatusBar.show();
      } catch (error) {
        console.error('Error initializing StatusBar:', error);
      }
    }
  }
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
