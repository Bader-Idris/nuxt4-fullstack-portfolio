import { defineStore } from 'pinia';
import { useSocketStore } from './useSocketStore';

// Define the structure of the User object, TODO: organize them in /types
export interface User {
  userId: string;
  username: string;
  role: "admin" | "user" | "guest";
  provider?: 'email' | 'google' | 'facebook'; 
}

export const useUserStore = defineStore("user", () => {
  // --- STATE ---
  //   const storedUser = ref<User | null>(
  //   typeof window !== "undefined"
  //     ? JSON.parse(localStorage.getItem("user") || "null")
  //     : null
  // );

  // // The user ref is now a computed property that returns the stored user 
  // // or a default guest user object if no one is logged in.
  // const user = computed<User>(() => {
  //   if (storedUser.value) {
  //     return storedUser.value;
  //   }
  //   // Return a default guest user when no user is stored
  //   return {
  //     userId: 'guest-' + (typeof window !== 'undefined' ? window.crypto.randomUUID() : 'server'),
  //     username: 'Guest',
  //     role: 'guest'
  //   };
  // });

  const user = ref<User | null>(null);

  // --- GETTERS ---
  const isAuthenticated = computed(() => !!user.value && user.value.role !== 'guest');
  const isGuest = computed(() => !isAuthenticated.value);
  const getUsername = computed(() => user.value?.username || 'Guest');
  const getUserId = computed(() => user.value?.userId);
  const getUserRole = computed(() => user.value?.role);

  // --- ACTIONS ---

  /**
   * The single, unified function to set the application's user state.
   * This is the central point for logging a user in.
   */
  function setUser(newUser: User | null) {
    if (!newUser) {
      // If called with null, treat it as a logout.
      clearUser();
      return;
    }

    user.value = newUser;

    if (import.meta.client) {
      // Persist to localStorage
      localStorage.setItem("user", JSON.stringify(newUser));
      // Initialize the socket connection for the authenticated user.
      const socketStore = useSocketStore();
      socketStore.initializeSocket();
    }
  }

  /**
   * The single, unified function to clear the user's session.
   */
  function clearUser(): void {
    user.value = null;
    if (import.meta.client) {
      // Clear persisted state
      localStorage.removeItem("user");
      // Disconnect the socket.
      const socketStore = useSocketStore();
      socketStore.disconnectSocket();
    }
  }

  return {
    user,
    isAuthenticated,
    isGuest,
    getUsername,
    getUserId,
    getUserRole,
    setUser,
    clearUser,
  };
});
