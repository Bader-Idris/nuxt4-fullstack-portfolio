export default defineNuxtPlugin(async (nuxtApp) => {
  const isCapacitorDevice: Promise<boolean> = useCapacitorDevice();
  const publicVapidKey = useRuntimeConfig().public.vapidPublicKey;
  // Convert base64 to Uint8Array for VAPID key
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }
    // Request notification permission and subscribe
    const requestNotificationPermission = async () => {
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          subscribeUser();
        }
      }
      return null;
    };

    const subscribeUser = async () => {
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
          });

          // Send subscription to server
          await $fetch("/api/v1/subscribe", {
            method: "POST",
            body: { subscription },
            baseUrl: config.public.originUrl,
          });

          return subscription;
        } catch (err) {
          console.log("Failed to subscribe:", err);
          return null;
        }
      }
    };

    if (import.meta.client) {
      if (await isCapacitorDevice) {
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
            // You might want to send this token to your backend using: token.value
          });

          PushNotifications.addListener("registrationError", (error) => {
            console.error("Error on registration:", JSON.stringify(error));
          });

          PushNotifications.addListener(
            "pushNotificationReceived",
            (notification) => {
              console.log("Push received:", JSON.stringify(notification));
              // Handle received notification
            }
          );

          PushNotifications.addListener(
            "pushNotificationActionPerformed",
            (notification) => {
              console.log(
                "Push action performed:",
                JSON.stringify(notification)
              );
              // Handle notification action
            }
          );
        }
      } else {
        // Register service worker on load
        window.addEventListener("load", async () => {
          if ("serviceWorker" in navigator) {
            try {
              await navigator.serviceWorker.register("/sw.js", {
                scope: "/",
              });
              console.log("Service Worker Registered...");
            } catch (err) {
              console.error("Service Worker registration failed:", err);
            }
          }
        })
      }
    }

  return {
    provide: {
      push: { 
        requestNotificationPermission, 
        subscribeUser 
      },
    },
  };
});
