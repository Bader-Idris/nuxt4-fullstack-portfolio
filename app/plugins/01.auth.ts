// app/plugins/01.auth.ts
import { useUserStore } from '~/stores/useUserSocket';

export default defineNuxtPlugin(async (nuxtApp) => {
  const userStore = useUserStore();

  // On the server, the user state is unknown. We try to initialize it from the cookie.
  if (import.meta.server) {
    // `useCookie` is the recommended way to access cookies in Nuxt 3.
    const accessToken = useCookie('accessToken');

    if (accessToken.value) {
      try {
        // `isTokenValid` is auto-imported from `server/utils`.
        // It will throw an error if the token is invalid or expired.
        const payload = isTokenValid(accessToken.value);
        if (payload && payload.user) {
          // If the token is valid, set the user in the store.
          // This is the single source of truth for the server-side render.
          userStore.setUser(payload.user);
        }
      } catch (e) {
        // This block runs if the token is expired or invalid.
        // We don't need to do anything; the user remains unauthenticated.
        console.log('Auth plugin: Invalid or expired token found on server.');
      }
    }
  }
});
