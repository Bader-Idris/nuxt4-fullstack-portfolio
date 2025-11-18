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

  // Don't attempt to restore session on public routes unless we have stored credentials
  const currentPath = window.location.pathname;
  const isPublicRoute = currentPath === '/' ||
                       currentPath.startsWith('/about') ||
                       currentPath.startsWith('/projects') ||
                       currentPath === '/contact' ||
                       currentPath.startsWith('/legal') ||
                       currentPath.startsWith('/privacy');

  // Only attempt session restoration if:
  // 1. We're on a protected route, OR
  // 2. We have stored credentials in localStorage/cookies that suggest the user was previously logged in
  const hasStoredCredentials = () => {
    if (typeof window !== 'undefined') {
      // Check for stored user in localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== 'null' && storedUser !== 'undefined') {
        return true;
      }
      // Check for auth cookies
      return document.cookie.includes('accessToken') || document.cookie.includes('refreshToken');
    }
    return false;
  };

  // If on a public route and no stored credentials, skip session restoration
  if (isPublicRoute && !hasStoredCredentials()) {
    return;
  }

  try {
    console.log('Attempting to restore user session...');
    const data = await $fetch('/api/v1/auth/me', {
      // Add a timeout to prevent hanging requests
      timeout: 5000
    });

    if (data && data.user) {
      userStore.setUser(data.user);
      console.log('User session restored successfully.');
    }
  } catch (error: any) {
    // This will fail if the user is not logged in (401 Unauthorized), which is expected.
    // We can safely ignore the error. The user remains unauthenticated.
    const status = error?.data?.statusCode || error?.status || 500;
    if (status !== 401) {
      // Log non-authentication errors
      console.log('Error restoring user session:', error);
    } else {
      console.log('No active user session found (401). User remains unauthenticated.');
    }
  }
});