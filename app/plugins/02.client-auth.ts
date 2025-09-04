// app/plugins/02.client-auth.ts

import { useUserStore, type User } from '~/stores/useUserSocket';

/**
 * A simple, client-side only JWT decoder.
 * This is NOT for validation, only for reading the payload to check expiration.
 */
function decodeJWT(token: string): { exp?: number } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to decode JWT on client", e);
    return null;
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  // This plugin runs once on the client when the app starts.
  if (import.meta.server) return;

  const userStore = useUserStore();

  // If the user state was already populated by the server-side plugin, we don't need to do anything.
  // The `setUser` call on the server does not persist to localStorage, so this check is safe.
  if (userStore.isAuthenticated) {
    // One edge case: The server-hydrated state is now on the client.
    // We should ensure it gets persisted to localStorage for tab consistency.
    if (userStore.user) {
      localStorage.setItem('user', JSON.stringify(userStore.user));
    }
    return;
  }

  // --- Main Client-Side Initialization Logic ---

  const accessToken = useCookie('accessToken');
  const storedUser = localStorage.getItem('user');

  // If there's no token or no user data in storage, ensure the user is cleared.
  if (!accessToken.value || !storedUser) {
    userStore.clearUser();
    return;
  }

  // If we have a token and stored user, check if the token is expired.
  const decodedToken = decodeJWT(accessToken.value);
  const isExpired = decodedToken?.exp ? decodedToken.exp * 1000 < Date.now() : false;

  if (isExpired) {
    console.log('Client auth plugin: Expired token found, clearing session.');
    userStore.clearUser();
    return;
  }

  // If we have a non-expired token and user data in storage, we can trust it.
  // This rehydrates the session for returning users.
  try {
    const userData: User = JSON.parse(storedUser);
    userStore.setUser(userData);
  } catch (e) {
    console.error('Client auth plugin: Error parsing user from localStorage', e);
    userStore.clearUser();
  }
});
