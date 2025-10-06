// app/plugins/01.auth.ts
import { useUserStore } from '~/stores/useUserSocket';

export default defineNuxtPlugin(async (_nuxtApp) => {
  // This plugin runs once on app startup.
  // Its purpose is to initialize the user's session from the server.

  if (import.meta.server) {
    // On the server, we don't need to do anything here.
    // The user state will be fetched if needed during the rendering process.
    return;
  }

  // On the client, try to fetch the user to restore the session.
  const userStore = useUserStore();

  // If the user is already authenticated (e.g., from a previous login in the same session),
  // we don't need to fetch them again.
  if (userStore.isAuthenticated) {
    return;
  }

  try {
    console.log('Attempting to restore user session...');
    const data = await $fetch('/api/v1/auth/me');
    
    if (data && data.user) {
      userStore.setUser(data.user);
      console.log('User session restored successfully.');
    }
  } catch {
    // This will fail if the user is not logged in (401 Unauthorized), which is expected.
    // We can safely ignore the error. The user remains unauthenticated.
    console.log('No active user session found.');
  }
});