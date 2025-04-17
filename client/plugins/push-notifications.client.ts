export default defineNuxtPlugin(async (nuxtApp) => {
  const isCapacitorDevice: Promise<boolean> = useCapacitorDevice();
  const publicVapidKey = useRuntimeConfig().public.vapidPublicKey;

  // Define these functions outside of any conditional blocks
  const requestNotificationPermission = async () => {
    if (!import.meta.client) return;

    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        return subscribeUser();
      }
    }
  };

  const subscribeUser = async () => {
    if (!import.meta.client) return;

    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      try {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });

        // Send subscription to server
        await $fetch("/api/v1/subscribe", {
          method: "POST",
          body: { subscription },
          baseUrl: useRuntimeConfig().public.originUrl,
        });

        return subscription;
      } catch (err) {
        console.log("Failed to subscribe:", err);
      }
    }
  };

  // Convert base64 to Uint8Array for VAPID key
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }

  // Only run initialization on client
  if (import.meta.client) {
    if (await isCapacitorDevice) {
      // Capacitor device code
      const { PushNotifications } = await import(
        "@capacitor/push-notifications"
      );

      // Request permission to use push notifications
      const result = await PushNotifications.requestPermissions();

      if (result.receive === "granted") {
        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();

        // Add listeners
        PushNotifications.addListener("registration", (token) => {
          console.log("Push registration success, token:", token.value);
        });

        PushNotifications.addListener("registrationError", (error) => {
          console.error("Error on registration:", JSON.stringify(error));
        });

        PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("Push received:", JSON.stringify(notification));
          }
        );

        PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (notification) => {
            console.log("Push action performed:", JSON.stringify(notification));
          }
        );
      }
    } else {
      // Web browser code
      window.addEventListener("load", async () => {
        if ("serviceWorker" in navigator) {
          try {
            // Register Service Worker
            console.log("Registering service worker...");
            await navigator.serviceWorker.register("/sw.js", {
              scope: "/",
            });
            console.log("Service Worker Registered...");
          } catch (err) {
            console.error("Service Worker registration failed:", err);
          }
        }
      });
    }
  }

  // Always return the provide object at the end of the plugin
  return {
    provide: {
      push: {
        requestNotificationPermission,
        subscribeUser,
      },
    },
  };
});
