import { defineStore } from 'pinia';
import { useSocketStore } from './useSocketStore';

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

  const isAuthenticated = computed(() => !!user.value && user.value.role !== 'guest');
  const isGuest = computed(() => !isAuthenticated.value);
  const getUsername = computed(() => user.value?.username || 'Guest');
  const getUserId = computed(() => user.value?.userId);
  const getUserRole = computed(() => user.value?.role);

  function setUser(newUser: User | null) {
    if (!newUser) {
      clearUser();
      return;
    }
    user.value = newUser;
    if (import.meta.client) {
      localStorage.setItem("user", JSON.stringify(newUser));
    }
    init();
  }

  function clearUser(): void {
    const socketStore = useSocketStore();
    socketStore.disconnectSocket();
    user.value = null;
    if (import.meta.client) {
      localStorage.removeItem("user");
      const accessToken = useCookie('accessToken');
      const refreshToken = useCookie('refreshToken');
      accessToken.value = null;
      refreshToken.value = null;
    }
  }

  function init() {
    if (import.meta.client && isAuthenticated.value) {
      const socketStore = useSocketStore();
      socketStore.initializeSocket();
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
    init,
  };
});
