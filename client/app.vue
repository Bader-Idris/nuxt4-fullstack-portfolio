<template>
  <div>
    <!-- <NuxtPwaAssets /> or -->
    <!-- <NuxtPwaManifest /> -->
    <!-- <NuxtLoadingIndicator> -->
    <RiveSplash
      v-if="showRiveSplash"
      src="/lottieToRive.riv"
      @animation-stopped="hideSplashAndShowApp"
    />
    <template v-if="showMainContent">
      <NuxtLayout>
        <NuxtPage v-slot="{ Component }">
          <Transition
            :name="isFirstLoad ? '' : 'fade'"
            mode="out-in"
            @before-enter="handleBeforeEnter"
          >
            <component :is="Component" :key="$route.fullPath" />
          </Transition>
        </NuxtPage>
      </NuxtLayout>
    </template>
  </div>
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
const showRiveSplash = ref(false)
const showMainContent = ref(false)

const isCapacitorDevice: Promise<boolean> = useCapacitorDevice()

const handleBeforeEnter = () => {
  if (isFirstLoad.value) {
    isFirstLoad.value = false;
  }
};

const notifyOffline = async function () {
  if (await isCapacitorDevice) {
    const { Toast } = await import('@capacitor/toast')
    await Toast.show({
      text: t("messages.NetworkStatus.offline"),
      duration: 'long',
      position: 'bottom'
    })
  } else return
}

// Initialize Capacitor functionality
const initCapacitorPrivileges = async () => {
  try {
    if (await isCapacitorDevice) {
      // Set up status bar (do NOT hide it initially)
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      const { SplashScreen } = await import('@capacitor/splash-screen') // wanting to hide splash screen after using rive's one
      // // TODO: try to make it dynamic as a plugin or composable!
      StatusBar.setStyle({ style: Style.Dark })
      StatusBar.setBackgroundColor({ color: '#01080E' })
      // StatusBar.hide()
      StatusBar.show() 
      // TODO: we need to add safe-area-inset-top
      StatusBar.setOverlaysWebView({ overlay: true }) // TODO: check this out, false will hide the content under status bar buttons

      await SplashScreen.hide(); // hide splash screen. read the docs at: https://capacitorjs.com/docs/apis/splash-screen#hiding-the-splash-screen

      const { AppLauncher } = await import('@capacitor/app-launcher');
      // Add deep linking listener
      // TODO: test it out, especially with query params
      // check these important requirements https://capacitorjs.com/docs/guides/deep-links#android-configuration
      // it says =======>  keytool -genkey -v -keystore KEY-NAME.keystore -alias ALIAS -keyalg RSA -keysize 2048 -validity 10000
      const { App: CapacitorApp, URLOpenListenerEvent } = await import('@capacitor/app')
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
    }
  } catch (error) {
    console.error('Error initializing Capacitor:', error)
  }
}

const hideSplashAndShowApp = async () => {
  showRiveSplash.value = false
  showMainContent.value = true
  if (await isCapacitorDevice) await initCapacitorPrivileges()
  await nextTick()
}

const offlineFn = async function () {
  // Set up network monitoring
  const { Network } = await import('@capacitor/network')
  Network.addListener('networkStatusChange', async (status) => {
    if (showMainContent.value) {
      if (!status.connected) {
        await notifyOffline()
      }
    }
  })

  const status = await Network.getStatus()
  if (showMainContent.value) {
    if (!status.connected) {
      await notifyOffline()
    }
  }
}

onMounted(async () => {
  // Initial page load transition handling, for SEO
  isFirstLoad.value = false;

  if (import.meta.client) {
    const isCap = await isCapacitorDevice
    if (isCap) {
      const { SplashScreen } = await import('@capacitor/splash-screen')
      await SplashScreen.hide();
      showRiveSplash.value = true
      await nextTick()
      // showMainContent.value = true
    } else {
      showMainContent.value = true // Skip splash for non-Capacitor
      await nextTick()
    }

    if (showMainContent.value) {
      offlineFn()
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
