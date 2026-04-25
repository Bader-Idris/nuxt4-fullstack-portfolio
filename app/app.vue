<template>
  <!-- for nuxt ui that requires tailwind to be installed! -->
  <!-- <UApp :toaster="{ position: 'top-center' }" > -->
    <RiveSplash
      v-if="showRiveSplash"
      src="/lottieToRive.riv"
      @animation-stopped="hideSplashAndShowApp"
    />

    <template v-if="showMainContent || !config.public.isCapacitor">
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
  <!-- </UApp> -->
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import type { URLOpenListenerEvent } from '@capacitor/app'
import { useColorMode } from '@vueuse/core'
import { useSound } from '@/composables/useSound'

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

// --- State ---
const showRiveSplash = ref(false)
const showMainContent = ref(false)
const isFirstLoad = ref(true)
const isOffline = ref(false)

useColorMode()

// --- Lifecycle & Initialization Flow ---

onMounted(async () => {
  isFirstLoad.value = false

  // First, show the Rive splash if on Capacitor, without waiting for any Capacitor APIs that might need network
  if (config.public.isCapacitor === true && Capacitor.isNativePlatform()) {
    // For native Capacitor builds, show the Rive splash screen first immediately
    showRiveSplash.value = true

    // Hide the native splash screen in the background (don't wait for it to complete)
    try {
      const { SplashScreen } = await import('@capacitor/splash-screen')
      await SplashScreen.hide()
    } catch (error) {
      console.error("Error hiding native splash screen:", error)
      // Proceed anyway, don't let splash screen errors block the app
    }
  } else {
    // For web builds, show the main content and initialize immediately.
    showMainContent.value = true
    await initializeMainApp()

    // Hide address bar on mobile devices
    if (import.meta.client && !config.public.isCapacitor) {
      setTimeout(() => {
        window.scrollTo(0, 1)
      }, 100)
    }
  }
})

/**
 * Hides the Rive splash screen and shows the main app.
 * Crucially, it renders the main content BEFORE initializing Capacitor plugins.
 */
const hideSplashAndShowApp = async () => {
  showRiveSplash.value = false
  showMainContent.value = true // 1. Show the main app UI to prevent a blank screen.
  await nextTick() // 2. Wait for the DOM to update.

  // Initialize main app, but ensure the UI is already visible even if plugins fail
  try {
    await initializeMainApp() // 3. THEN, initialize the plugins.
  } catch (error) {
    console.error("Error initializing main app, but UI is still available:", error)
    // The app should continue working even if some plugins fail to initialize
  }
}

/**
 * Groups the main application's client-side initializations.
 * This function is now safely called after the main UI is visible.
 */
const initializeMainApp = async () => {
  const { muteAll } = useSound()

  // Handle web visibility change (screen lock/tab switch)
  if (import.meta.client) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        muteAll(true)
      } else {
        muteAll(false)
      }
    })
  }

  if (Capacitor.isNativePlatform()) {
    // Initialize each plugin separately so that if one fails, others can still work
    try {
      await initCapacitorPlatform();
      // Add Capacitor-specific background listener
      const { App: CapacitorApp } = await import('@capacitor/app')
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        muteAll(!isActive)
      })
    } catch (error) {
      console.error("Error initializing Capacitor platform features:", error);
    }

    try {
      await initNetworkListener();
    } catch (error) {
      console.error("Error initializing network listener:", error);
    }

    try {
      await initPushNotifications();
    } catch (error) {
      console.error("Error initializing push notifications:", error);
    }
  } else {
    try {
      await initNetworkListener();
    } catch (error) {
      console.error("Error initializing network listener:", error);
    }
  }
}

// --- Capacitor Plugin Initializers (No changes needed in these functions) ---

const initCapacitorPlatform = async () => {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    const { App: CapacitorApp } = await import('@capacitor/app')
    const { AppLauncher } = await import('@capacitor/app-launcher');

    StatusBar.setStyle({ style: Style.Dark })
    StatusBar.setBackgroundColor({ color: '#01080E' })
    StatusBar.setOverlaysWebView({ overlay: true })
    StatusBar.show()

    CapacitorApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        const url = new URL(event.url);
        router.push({ path: url.pathname, query: Object.fromEntries(url.searchParams) });
    });

    document.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        const originUrl = config.public.originUrl;
        const appId = config.public.appId;
        if (anchor && anchor.href && originUrl && appId && anchor.href.startsWith(originUrl)) {
            e.preventDefault();
            const appUrl = anchor.href.replace(/^(https?:\/\/)/, `${appId}://`);
            try {
                const { value } = await AppLauncher.canOpenUrl({ url: appUrl });
                if (value) {
                    await AppLauncher.openUrl({ url: appUrl });
                } else {
                    window.open(anchor.href, '_blank');
                }
            } catch (error) {
                console.error("Error handling app link:", error);
                window.open(anchor.href, '_blank');
            }
        }
    });

    let lastBackPressed = 0
    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack && route.fullPath === '/') {
        const currentTime = new Date().getTime()
        if (currentTime - lastBackPressed < 2000) {
          CapacitorApp.exitApp()
        } else {
          lastBackPressed = currentTime
          import('@capacitor/toast').then(({ Toast }) => {
            Toast.show({
              text: t('messages.backToExit'),
              duration: 'short',
              position: 'bottom'
            })
          })
        }
      } else {
        router.go(-1)
      }
    })
  } catch (error) {
    console.error('Error initializing Capacitor platform features:', error)
  }
}

const initNetworkListener = async () => {
  try {
    const { Network } = await import('@capacitor/network')
    Network.addListener('networkStatusChange', (status) => {
      isOffline.value = !status.connected
      if (isOffline.value) {
        notifyUserIsOffline()
      }
    })
    const status = await Network.getStatus()
    if (!status.connected) {
      isOffline.value = true
      notifyUserIsOffline()
    }
  } catch (error) {
    console.error('Could not initialize network listener:', error)
    isOffline.value = true
  }
}

const initPushNotifications = async () => {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    let permStatus = await PushNotifications.checkPermissions()
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions()
    }
    if (permStatus.receive !== 'granted') {
      console.warn('User denied push notification permissions.')
      return
    }
    await PushNotifications.register()
    PushNotifications.addListener('registration', (token) => {
      console.info('Push registration success. Token:', token.value)
    })
    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err.error)
    })
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification)
    })
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed', notification.actionId)
    })
  } catch (error) {
    console.error('Error initializing push notifications:', error)
  }
}

// --- Helper Functions ---

const handleBeforeEnter = () => {
  if (isFirstLoad.value) {
    isFirstLoad.value = false
  }
}

const notifyUserIsOffline = async () => {
    try {
        const { Toast } = await import('@capacitor/toast')
        await Toast.show({
          text: t('messages.NetworkStatus.offline'),
          duration: 'long',
          position: 'bottom'
        })
    } catch(e) {
        console.error("Failed to show offline toast", e);
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
:root {
  --full-viewport-height: 100dvh;
  height: var(--full-viewport-height);
  width: $full-viewport-width;
}

body {
  background-color: $primary1;
  color: $secondary1;
}

#__nuxt {
  margin: 30px;

  @include mobile {
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>