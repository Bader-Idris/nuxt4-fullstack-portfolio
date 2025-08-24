export const usePushNotifications = () => {
  const config = useRuntimeConfig();
  const { $toast } = useNuxtApp();

  const isSupported = computed(() => {
    if (typeof window === 'undefined') return false;
    return 'serviceWorker' in navigator && 'PushManager' in window;
  });

  /**
   * Converts a VAPID public key from a URL-safe base64 string to a Uint8Array.
   * @param base64String The VAPID public key.
   */
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Asks for user permission and subscribes to push notifications.
   */
  const subscribeToPushNotifications = async () => {
    if (!isSupported.value) {
      $toast.error('Push notifications are not supported in this browser.');
      return;
    }

    const swRegistration = await navigator.serviceWorker.ready;
    const permission = await window.Notification.requestPermission();

    if (permission !== 'granted') {
      $toast.warning('Permission for notifications was not granted.');
      return;
    }

    try {
      const vapidPublicKey = config.public.vapidPublicKey;
      if (!vapidPublicKey) {
        console.error('VAPID public key is not configured.');
        $toast.error('Client configuration error. Cannot subscribe.');
        return;
      }

      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send the subscription to the backend
      await $fetch('/api/v1/subscribe', {
        method: 'POST',
        body: { subscription },
      });

      $toast.success('Successfully subscribed to notifications!');
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      $toast.error('Failed to subscribe. Please try again.');
    }
  };

  return {
    isSupported,
    subscribeToPushNotifications,
  };
};
