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
const route = useRoute()
const router = useRouter()

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
    const { Device } = await import('@capacitor/device')
    const info = await Device.getInfo()
    isCapacitorDevice.value = info.platform !== 'web'

    if (isCapacitorDevice.value) {
      // Set up status bar (do NOT hide it initially)
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      StatusBar.setStyle({ style: Style.Dark })
      StatusBar.setBackgroundColor({ color: '#01080E' })
      StatusBar.hide()
      StatusBar.setOverlaysWebView({ overlay: true })

      // Set up network monitoring
      const { Network } = await import('@capacitor/network')
      Network.addListener('networkStatusChange', async (status) => {
        if (!status.connected) {
          await notifyOffline()
        }
      })

      const status = await Network.getStatus()
      if (!status.connected) {
        await notifyOffline()
      }

      // Register back button handler
      const { App: CapacitorApp } = await import('@capacitor/app')
      let lastBackPressed = 0

      CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
        if (!canGoBack && route.fullPath === '/') {
          const currentTime = new Date().getTime()

          if (currentTime - lastBackPressed < 2000) {
            CapacitorApp.exitApp()
          } else {
            lastBackPressed = currentTime
            const { Toast } = await import('@capacitor/toast')
            await Toast.show({
              text: t('messages.backToExit'),
              duration: 'short',
              position: 'bottom'
            })
          }
        } else {
          router.go(-1)
        }
      })
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
