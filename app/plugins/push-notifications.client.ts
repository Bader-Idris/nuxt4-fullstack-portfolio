import { usePushNotifications } from "~/composables/usePushNotifications";

export default defineNuxtPlugin(async (_nuxtApp) => {
  const {
    isCapacitor,
    initialize,
    subscribeToWebPush,
    subscribeToCapacitorPush,
  } = usePushNotifications();

  if (import.meta.client) {
    const config = useRuntimeConfig();

    if (isCapacitor) {
      initialize();
    } else if (!config.public.isDesktop) {
      // Service Workers are NOT supported in Electron renderer processes.
      // Attempting to register one throws InvalidStateError in the renderer.
      // Skip SW registration entirely for all desktop (Electron/Electrobun) builds.
      if ("serviceWorker" in navigator) {
        try {
          console.log("Registering service worker...");
          navigator.serviceWorker
            .register("/sw.js", {
              scope: "/",
            })
            .then((registration) => {
              console.log("Service Worker Registered...", registration);
            });
        } catch (err) {
          console.error("Service Worker registration failed:", err);
        }
      }
    }
  }

  return {
    provide: {
      push: {
        subscribeToWebPush,
        subscribeToCapacitorPush,
        isCapacitor,
      },
    },
  };
});