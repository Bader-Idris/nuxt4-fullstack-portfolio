export default defineNuxtPlugin(async (nuxtApp) => {
  // Only run on client and when in Capacitor environment
  if (import.meta.client) {
    try {
      const { Device } = await import("@capacitor/device");
      const info = await Device.getInfo();

      // Only initialize push notifications on native platforms
      if (info.platform !== "web") {
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
            // You might want to send this token to your backend
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
      }
    } catch (error) {
      console.error("Error initializing push notifications:", error);
    }
  }
});
