import { defineStore } from 'pinia';
import { useSocketStore } from './useSocketStore';
import { useMessagesStore } from './useMessagesStore';
import { useOnlineUsersStore } from './useOnlineUsersStore';

// Define the structure of the User object to match your login response
export interface User {
  userId: string;
  username: string;
  role: "admin" | "user" | "guest";
}

// Define and export the Pinia store using the Composition API
export const useUserStore = defineStore("user", () => {
  // --- STATE ---
  const storedUser = ref<User | null>(
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "null")
      : null
  );

  // The user ref is now a computed property that returns the stored user 
  // or a default guest user object if no one is logged in.
  const user = computed<User>(() => {
    if (storedUser.value) {
      return storedUser.value;
    }
    // Return a default guest user when no user is stored
    return {
      userId: 'guest-' + (typeof window !== 'undefined' ? window.crypto.randomUUID() : 'server'),
      username: 'Guest',
      role: 'guest'
    };
  });

  // --- GETTERS ---
  const isAuthenticated = computed(() => !!storedUser.value); // True only for logged-in users
  const isGuest = computed(() => !storedUser.value);
  const getUsername = computed(() => user.value.username);
  const getUserId = computed(() => user.value.userId);
  const getUserRole = computed(() => user.value.role);

  // --- ACTIONS ---
  /**
   * Clears all user-related data from stores and disconnects the socket.
   * This is a helper function to be used by setUser and clearUser.
   */
  function resetAllStores() {
    const socketStore = useSocketStore();
    const messagesStore = useMessagesStore();
    const onlineUsersStore = useOnlineUsersStore();

    // Disconnect socket and clear its state
    socketStore.disconnectSocket();

    // Clear all message history and from localStorage
    messagesStore.clearAllData();

    // Clear the list of online users
    onlineUsersStore.clearUsers();
  }

  /**
   * Sets the user in the store and persists it to localStorage.
   * This should be called after a successful login.
   * @param newUser - The user object received from the login endpoint.
   */
  function setUser(newUser: User): void {
    // First, reset all existing user data
    resetAllStores();
    
    // Then, set the new user
    storedUser.value = newUser;
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(newUser));
    }
  }

  /**
   * Clears the user from the store and localStorage, effectively making them a guest.
   */
  function clearUser(): void {
    resetAllStores();
    storedUser.value = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
    }
  }

  return {
    user,
    isAuthenticated, // Renamed from isLoggedIn for clarity
    isGuest,
    getUsername,
    getUserId,
    getUserRole,
    setUser,
    clearUser,
  };
});
