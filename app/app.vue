<template>
  <!-- for nuxt ui that requires tailwind to be installed! -->
  <!-- <UApp :toaster="{ position: 'top-center' }" > -->
  <RiveSplash
    v-if="showRiveSplash"
    src="/lottieToRive.riv"
    @animation-stopped="hideSplashAndShowApp"
  />

  <template v-if="showMainContent || !config.public.isCapacitor">
    <!-- <SkewNotification v-slot="{ isCurrentChunksOutdated, reload }">
        <div v-if="isCurrentChunksOutdated" class="update-notification">
          <span>{{ t('messages.updateAvailable', 'A new version is available!') }}</span>
          <button @click="reload">{{ t('messages.refresh', 'Refresh') }}</button>
        </div>
      </SkewNotification> -->
    <NuxtLayout>
      <NuxtPage v-slot="{ Component }">
        <!-- Transition is only applied if NOT first load to avoid hydration mismatches -->
        <Transition
          v-if="!isFirstLoad"
          name="fade"
          mode="out-in"
          @before-enter="handleBeforeEnter"
        >
          <component :is="Component" :key="$route.fullPath" />
        </Transition>
        <!-- Static component for initial hydration to match server output -->
        <component :is="Component" v-else :key="$route.fullPath" />
      </NuxtPage>
    </NuxtLayout>
  </template>
  <!-- </UApp> -->
</template>

<script setup lang="ts">
import { Capacitor } from "@capacitor/core";
import type { URLOpenListenerEvent } from "@capacitor/app";
import { useColorMode } from "@vueuse/core";
import { useSound } from "@/composables/useSound";

const { t } = useI18n({ useScope: "global" });
const config = useRuntimeConfig();

useSeoMeta({
  titleTemplate: "%s | Bader Idris",
  ogSiteName: "Bader Idris - Portfolio",
  ogType: "website",
  ogUrl: config.public.originUrl,
  twitterCard: "summary_large_image",
  twitterSite: "@bader_idri8628",
  appleMobileWebAppCapable: "yes",
  appleMobileWebAppStatusBarStyle: "black-translucent",
  mobileWebAppCapable: "yes",
  themeColor: "#01080E",
});

useHead({
  meta: [
    // PWA / mobile app meta
    { name: "apple-mobile-web-app-capable", content: "yes" },
    {
      name: "apple-mobile-web-app-status-bar-style",
      content: "black-translucent",
    },
    { name: "mobile-web-app-capable", content: "yes" },
    // { // nginx is sufficient 
    //   "http-equiv": "Content-Security-Policy",
    //   content: "default-src 'self' 'unsafe-eval' 'unsafe-inline' http: https: ws: wss: blob: data: capacitor://localhost; img-src 'self' https://baderidris.com https://*.githubusercontent.com https://www.googletagmanager.com https://*.google-analytics.com https://*.g.doubleclick.net https://*.clarity.ms https://c.bing.com data:;"
    // },
  ],
  link: [
    {
      rel: "icon",
      type: "image/x-icon",
      sizes: "48x48",
      href: "/favicon.ico",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      href: "/favicon-16x16.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      href: "/favicon-32x32.png",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      sizes: "180x180",
      href: "/apple-touch-icon.png",
    },
    {
      rel: "icon",
      type: "image/webp",
      sizes: "192x192",
      href: "/icon-192.webp",
    },
    {
      rel: "icon",
      type: "image/webp",
      sizes: "128x128",
      href: "/icon-128.webp",
    },
    // ✅ Optional but recommended for PWA
    // { rel: "manifest", href: "/site.webmanifest" },
  ],
});

const route = useRoute();
const router = useRouter();

// --- Clarity Tracking Protection ---
// According to Nuxt Scripts docs, we use the registry pattern and can manually load/control the script.
const { load, status } = useScriptClarity();

const isClarityEnabled = computed(() => {
  if (!import.meta.client) return false;
  
  const protectedRoutes = [
    "/dashboard",
    "/contact/admin",
    "/user/",
    "/api/",
  ];

  return !protectedRoutes.some(p => route.path.includes(p));
});

// Load Clarity conditionally based on route
if (import.meta.client && config.public.scripts.clarity?.id) {
  watch(isClarityEnabled, (enabled) => {
    if (enabled && status.value === 'awaitingLoad') {
      load();
    }
  }, { immediate: true });
}

// --- State ---
const showRiveSplash = ref(false);
const showMainContent = ref(false);
const isFirstLoad = ref(true);
const isOffline = ref(false);

useColorMode();

// --- Lifecycle & Initialization Flow ---

onMounted(async () => {
  isFirstLoad.value = false;

  // First, show the Rive splash if on Capacitor, without waiting for any Capacitor APIs that might need network
  if (config.public.isCapacitor === true && Capacitor.isNativePlatform()) {
    // For native Capacitor builds, show the Rive splash screen first immediately
    showRiveSplash.value = true;

    // Hide the native splash screen in the background (don't wait for it to complete)
    try {
      const { SplashScreen } = await import("@capacitor/splash-screen");
      await SplashScreen.hide();
    } catch (error) {
      console.error("Error hiding native splash screen:", error);
      // Proceed anyway, don't let splash screen errors block the app
    }
  } else {
    // For web builds, show the main content and initialize immediately.
    showMainContent.value = true;
    await initializeMainApp();

    // Hide address bar on mobile devices
    if (import.meta.client && !config.public.isCapacitor) {
      setTimeout(() => {
        window.scrollTo(0, 1);
      }, 100);
    }
  }
});

/**
 * Hides the Rive splash screen and shows the main app.
 * Crucially, it renders the main content BEFORE initializing Capacitor plugins.
 */
const hideSplashAndShowApp = async () => {
  showRiveSplash.value = false;
  showMainContent.value = true; // 1. Show the main app UI to prevent a blank screen.
  await nextTick(); // 2. Wait for the DOM to update.

  // Initialize main app, but ensure the UI is already visible even if plugins fail
  try {
    await initializeMainApp(); // 3. THEN, initialize the plugins.
  } catch (error) {
    console.error(
      "Error initializing main app, but UI is still available:",
      error,
    );
    // The app should continue working even if some plugins fail to initialize
  }
};

/**
 * Groups the main application's client-side initializations.
 * This function is now safely called after the main UI is visible.
 */
const initializeMainApp = async () => {
  const { muteAll } = useSound();

  // Handle web visibility change (screen lock/tab switch)
  if (import.meta.client) {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        muteAll(true);
      } else {
        muteAll(false);
      }
    });
  }

  if (config.public.isCapacitor && Capacitor.isNativePlatform()) {
    // Initialize each plugin separately so that if one fails, others can still work
    try {
      await initCapacitorPlatform();
      // Add Capacitor-specific background listener
      const { App: CapacitorApp } = await import("@capacitor/app");
      CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        muteAll(!isActive);
      });
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
  } else if (import.meta.client) {
    // Web-native network listener
    const updateOnlineStatus = () => {
      isOffline.value = !navigator.onLine;
      if (isOffline.value) {
        notifyUserIsOffline();
      }
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Initial check
    updateOnlineStatus();
  }
};

// --- Capacitor Plugin Initializers (No changes needed in these functions) ---

const initCapacitorPlatform = async () => {
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    const { App: CapacitorApp } = await import("@capacitor/app");
    const { AppLauncher } = await import("@capacitor/app-launcher");

    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: "#01080E" });
    StatusBar.setOverlaysWebView({ overlay: true });
    StatusBar.show();

    CapacitorApp.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      const url = new URL(event.url);
      router.push({
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
      });
    });

    document.addEventListener("click", async (e) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      const originUrl = config.public.originUrl;
      const appId = config.public.appId;
      if (
        anchor &&
        anchor.href &&
        originUrl &&
        appId &&
        anchor.href.startsWith(originUrl)
      ) {
        e.preventDefault();
        const appUrl = anchor.href.replace(/^(https?:\/\/)/, `${appId}://`);
        try {
          const { value } = await AppLauncher.canOpenUrl({ url: appUrl });
          if (value) {
            await AppLauncher.openUrl({ url: appUrl });
          } else {
            window.open(anchor.href, "_blank");
          }
        } catch (error) {
          console.error("Error handling app link:", error);
          window.open(anchor.href, "_blank");
        }
      }
    });

    let lastBackPressed = 0;
    CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (!canGoBack && route.fullPath === "/") {
        const currentTime = new Date().getTime();
        if (currentTime - lastBackPressed < 2000) {
          CapacitorApp.exitApp();
        } else {
          lastBackPressed = currentTime;
          import("@capacitor/toast").then(({ Toast }) => {
            Toast.show({
              text: t("messages.backToExit"),
              duration: "short",
              position: "bottom",
            });
          });
        }
      } else {
        router.go(-1);
      }
    });
  } catch (error) {
    console.error("Error initializing Capacitor platform features:", error);
  }
};

const initNetworkListener = async () => {
  try {
    const { Network } = await import("@capacitor/network");
    Network.addListener("networkStatusChange", (status) => {
      isOffline.value = !status.connected;
      if (isOffline.value) {
        notifyUserIsOffline();
      }
    });
    const status = await Network.getStatus();
    if (!status.connected) {
      isOffline.value = true;
      notifyUserIsOffline();
    }
  } catch (error) {
    console.error("Could not initialize network listener:", error);
    isOffline.value = true;
  }
};

const initPushNotifications = async () => {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== "granted") {
      console.warn("User denied push notification permissions.");
      return;
    }
    await PushNotifications.register();
    PushNotifications.addListener("registration", (token) => {
      console.info("Push registration success. Token:", token.value);
    });
    PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration error:", err.error);
    });
    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log("Push notification received:", notification);
      },
    );
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification) => {
        console.log(
          "Push notification action performed",
          notification.actionId,
        );
      },
    );
  } catch (error) {
    console.error("Error initializing push notifications:", error);
  }
};

// --- Helper Functions ---

const handleBeforeEnter = () => {
  if (isFirstLoad.value) {
    isFirstLoad.value = false;
  }
};

const notifyUserIsOffline = async () => {
  try {
    const { Toast } = await import("@capacitor/toast");
    await Toast.show({
      text: t("messages.NetworkStatus.offline"),
      duration: "long",
      position: "bottom",
    });
  } catch (e) {
    console.error("Failed to show offline toast", e);
  }
};

// --- Developer Console Message ---
if (import.meta.client) {
  console.log(
    "%cWelcome to my %cfull-stack %capp",
    'color: #fb853b; font-weight: bold; font-family: "Fira Code"; font-size: 30px;',
    'color: #3c9d93; font-weight: bold; font-family: "Fira Code"; font-size: 32px;',
    'color: #fb853b; font-weight: bold; font-family: "Fira Code"; font-size: 30px;',
  );
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

/* .update-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background-color: $primary2;
  color: $secondary1;
  padding: 12px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  border: 1px solid $accent1;

  span {
    font-size: 0.9rem;
    font-weight: 500;
  }

  button {
    background-color: $accent1;
    color: $primary1;
    border: none;
    padding: 6px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-size: 0.85rem;
    transition: background-color 0.2s;

    &:hover {
      background-color: color-mix(in srgb, $accent1, white 10%);
    }
  }

  @include mobile {
    width: calc(100% - 40px);
    top: 10px;
    padding: 10px 16px;
    font-size: 0.8rem;
  }
} */
</style>