<template>
  <RiveSplash
    v-if="showRiveSplash"
    src="/lottieToRive.riv"
    @animation-stopped="hideSplashAndShowApp"
  />

  <template v-else>
    <NuxtLayout>
      <NuxtPage v-slot="{ Component }">
        <Transition
          :name="isFirstLoad ? '' : 'fade'"
          mode="out-in"
          @before-enter="handleBeforeEnter"
        >
          <component
            :is="Component"
            :key="$route.fullPath"
          />
        </Transition>
      </NuxtPage>
    </NuxtLayout>
  </template>
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
const config = useRuntimeConfig()
const isCapacitorBuild = config.public.isCapacitor === true
const isCapacitorDevice: Promise<boolean> = useCapacitorDevice()

// This single ref now controls whether the splash or the main app is shown.
// It defaults to false, so SSR and standard web builds render the app directly.
const showRiveSplash = ref(false)
const isFirstLoad = ref(true)

// --- Lifecycle and Initialization ---
onMounted(async () => {
  isFirstLoad.value = false // For page transition logic

  if (isCapacitorBuild && import.meta.client) {
    // For Electron builds, we want to show our custom splash screen.
    showRiveSplash.value = true
    // If you are using Capacitor for Electron, hide its native splash.
    if (await isCapacitorDevice) {
      const { SplashScreen } = await import('@capacitor/splash-screen')
      await SplashScreen.hide()
    }
  } else {
    // For SSR or regular web builds, initialize the app immediately.
    await initializeMainApp()
  }
})

/**
 * Hides the Rive splash screen and initializes the main application logic.
 * This is triggered by the @animation-stopped event from the RiveSplash component.
 */
const hideSplashAndShowApp = async () => {
  showRiveSplash.value = false
  await nextTick() // Wait for the DOM to update before initializing
  await initializeMainApp()
}

/**
 * Groups the main application's client-side initializations.
 * This includes Capacitor-specific features and network status listeners.
 */
const initializeMainApp = async () => {
  if (import.meta.client) {
    if (await isCapacitorDevice) {
      await initCapacitorPrivileges()
    }
    await offlineFn()
  }
}

// --- Event Handlers ---
const handleBeforeEnter = () => {
  if (isFirstLoad.value) {
    isFirstLoad.value = false
  }
}

// const notifyOffline = async function () {
//   if (await isCapacitorDevice) {
//     const { Toast } = await import('@capacitor/toast')
//     await Toast.show({
//       text: t("messages.NetworkStatus.offline"),
//       duration: 'long',
//       position: 'bottom'
//     })
//   } else return
// }

// Initialize Capacitor functionality
const initCapacitorPrivileges = async () => {
  try {
    // Set up status bar (do NOT hide it initially)
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    const { SplashScreen } = await import('@capacitor/splash-screen') // wanting to hide splash screen after using rive's one
    const { App: CapacitorApp, URLOpenListenerEvent } = await import('@capacitor/app')
    const { AppLauncher } = await import('@capacitor/app-launcher');

    // // TODO: try to make it dynamic as a plugin or composable!
    StatusBar.setStyle({ style: Style.Dark })
    StatusBar.setBackgroundColor({ color: '#01080E' })
    // StatusBar.hide()
    StatusBar.show()
    // TODO: we need to add safe-area-inset-top
    StatusBar.setOverlaysWebView({ overlay: true }) // TODO: check this out, false will hide the content under status bar buttons

    await SplashScreen.hide(); // hide splash screen. read the docs at: https://capacitorjs.com/docs/apis/splash-screen#hiding-the-splash-screen

    // Add deep linking listener
    // TODO: test it out, especially with query params
    // check these important requirements https://capacitorjs.com/docs/guides/deep-links#android-configuration
    // it says =======>  keytool -genkey -v -keystore KEY-NAME.keystore -alias ALIAS -keyalg RSA -keysize 2048 -validity 10000
    CapacitorApp.addListener('appUrlOpen', async (event: typeof URLOpenListenerEvent) => {
      try {
        const url = new URL(event.url);
        const path = url.pathname;
        if (path && path !== '/') {
          await navigateTo({
            path: path,
            query: Object.fromEntries(url.searchParams)
          });
        }
      } catch (error) {
        console.error('Failed to navigate to deep link:', error);
      }
    });

    // Handle external links to force them to open in the app when possible
    // This can be used in combination with NuxtLink to ensure proper handling
    const handleExternalLinks = () => {
      document.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');

        if (anchor && anchor.href && anchor.href.startsWith(useRuntimeConfig().public.originUrl)) {
          e.preventDefault();

          // Check if the app can handle this URL
          const { value } = await AppLauncher.canOpenUrl({
            url: anchor.href.replace('https://', process.env.BUNDLE_OR_APP_ID + '://')
          });

          if (value) {
            // Open in the app
            await AppLauncher.openUrl({
              url: anchor.href.replace('https://', process.env.BUNDLE_OR_APP_ID + '://')
            });
          } else {
            // Fallback to browser
            window.open(anchor.href, '_blank');
          }
        }
      });
    };
    handleExternalLinks();

    // Register back button handler
    let lastBackPressed = 0

    // TODO: make it more native, it's ugly yet!
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
  } catch (error) {
    console.error('Error initializing Capacitor:', error)
  }
}


const offlineFn = async () => {
  const { Network } = await import('@capacitor/network')
  Network.addListener('networkStatusChange', (status) => {
    if (!status.connected) {
      notifyOffline()
    }
  })

  const status = await Network.getStatus()
  if (!status.connected) {
    await notifyOffline()
  }
}

const notifyOffline = async () => {
  if (await isCapacitorDevice) {
    const { Toast } = await import('@capacitor/toast')
    await Toast.show({
      text: t('messages.NetworkStatus.offline'),
      duration: 'long',
      position: 'bottom'
    })
  }
}

// --- Developer Console Message ---
if (import.meta.client) {
  console.log(
    '%cWelcome to my %cfull-stack %capp',
    'color: #fb853b; font-weight: bold; font-family: "Fira Code"; font-size: 30px;',
    'color: #3c9d93; font-weight: bold; font-family: "Fira Code"; font-size: 32px;',
    'color: #fb853b; font-weight: bold; font-family: "Fira Code"; font-size: 30px;'
  )
}
</script>

<style lang="scss">
// TODO: we can put them directly to the main.scss file for more organization
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
