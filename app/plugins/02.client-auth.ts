import { useUserStore } from '~/stores/useUserSocket';

export default defineNuxtPlugin(() => {
  if (import.meta.server) return;
  
  // The user store now hydrates itself from localStorage.
  // The server-side plugin (01.auth.ts) will hydrate it from the cookie if available.
  // We just need to trigger the initialization logic.
  // If the user is authenticated, this will connect the socket.
  // If the token is invalid, the socket connection will fail, and the
  // 'connect_error' handler in the socket store will clear the user session.
  // This creates a clean, reactive flow.
  useUserStore().init();
});
