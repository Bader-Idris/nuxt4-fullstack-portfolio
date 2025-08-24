// Define the structure of the User object to match your login response
export interface User {
  userId: string;
  username: string; // Changed from 'name' to 'username' to match your store
  role: "admin" | "user" | "guest";
}

// Define the state interface
interface UserState {
  user: User | null;
}

// Define and export the Pinia store using the Composition API
export const useUserStore = defineStore("user", () => {
  // --- STATE ---
  // Initialize user from localStorage on the client-side, or null on the server-side.
  const user = ref<User | null>(
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "null")
      : null
  );

  // --- GETTERS ---
  const isLoggedIn = computed(() => !!user.value?.userId);
  const getUsername = computed(() => user.value?.username);
  const getUserId = computed(() => user.value?.userId);
  const getUserRole = computed(() => user.value?.role);

  // --- ACTIONS ---
  /**
   * Sets the user in the store and persists it to localStorage.
   * This should be called after a successful login.
   * @param newUser - The user object received from the login endpoint.
   */
  function setUser(newUser: User): void {
    user.value = newUser;
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(newUser));
    }
  }

  /**
   * Clears the user from the store and localStorage.
   * This should be called on logout.
   */
  function clearUser(): void {
    user.value = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
    }
  }

  return {
    user,
    isLoggedIn,
    getUsername,
    getUserId,
    getUserRole,
    setUser,
    clearUser,
  };
});
