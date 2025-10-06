import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';

export const usePushNotifications = () => {
  const config = useRuntimeConfig();

  const isWebPushSupported = computed(() => {
    if (typeof window === 'undefined') return false;
    return 'serviceWorker' in navigator && 'PushManager' in window;
  });

  const isCapacitor = Capacitor.isNativePlatform();

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const subscribeToWebPush = async () => {
    if (!isWebPushSupported.value) {
      // $toast.error('Push notifications are not supported in this browser.');
      toast('Push notifications are not supported in this browser.', {
        theme: 'auto',
        type: 'error',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });
      return;
    }

    const swRegistration = await navigator.serviceWorker.ready;
    const permission = await window.Notification.requestPermission();

    if (permission !== 'granted') {
      // $toast.warning('Permission for notifications was not granted.');
      toast('Permission for notifications was not granted.', {
        theme: 'auto',
        type: 'error',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });
      return;
    }

    try {
      const vapidPublicKey = config.public.vapidPublicKey;
      console.log('Using VAPID public key:', vapidPublicKey);
      if (!vapidPublicKey) {
        console.error('VAPID public key is not configured.');
        // $toast.error('Client configuration error. Cannot subscribe.');
        toast('Client configuration error. Cannot subscribe.', {
          theme: 'auto',
          type: 'error',
          position: 'top-center',
          dangerouslyHTMLString: true,
        });
        return;
      }

      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      await $fetch('/api/v1/push/subscribe', {
        method: 'POST',
        body: { subscription },
        baseURL: config.public.originUrl,
      });

      // $toast.success('Successfully subscribed to notifications!');
      toast('Successfully subscribed to notifications!', {
        theme: 'auto',
        type: 'success',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      // $toast.error('Failed to subscribe. Please try again.');
      toast('Failed to subscribe. Please try again.', {
        theme: 'auto',
        type: 'error',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });
    }
  };

  const subscribeToCapacitorPush = async () => {
    if (!isCapacitor) {
      // $toast.error('Capacitor is not available.');
      toast('Capacitor is not available.', {
        theme: 'auto',
        type: 'error',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });
      return;
    }

    const result = await PushNotifications.requestPermissions();
    if (result.receive === 'granted') {
      await PushNotifications.register();
    } else {
      // $toast.warning('Permission for notifications was not granted.');
      toast('Permission for notifications was not granted.', {
        theme: 'auto',
        type: 'warning',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });
    }
  };

  const initialize = () => {
    if (isCapacitor) {
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        try {
          await $fetch('/api/v1/push/subscribe-capacitor', {
            method: 'POST',
            body: {
              token: token.value,
              platform: Capacitor.getPlatform(),
            },
            baseURL: config.public.originUrl
          });
          // $toast.success('Successfully subscribed to notifications!');
          toast('Successfully subscribed to notifications!', {
            theme: 'auto',
            type: 'success',
            position: 'top-center',
            dangerouslyHTMLString: true,
          });
        } catch (error) {
          console.error('Failed to send Capacitor token to server:', error);
          // $toast.error('Failed to subscribe. Please try again.');
          toast('Failed to subscribe. Please try again.', {
            theme: 'auto',
            type: 'error',
            position: 'top-center',
            dangerouslyHTMLString: true,
          });
        }
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration:', JSON.stringify(error));
        // $toast.error('Failed to subscribe to notifications.');
        toast('Failed to subscribe to notifications.', {
          theme: 'auto',
          type: 'error',
          position: 'top-center',
          dangerouslyHTMLString: true,
        });
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('Push received:', JSON.stringify(notification));
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
        console.log('Push action performed:', JSON.stringify(notification));
      });
    }
  };

  return {
    isWebPushSupported,
    isCapacitor,
    subscribeToWebPush,
    subscribeToCapacitorPush,
    initialize,
  };
};