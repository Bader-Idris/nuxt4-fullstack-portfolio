import { defineStore } from 'pinia';
import { io, type Socket } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { useOnlineUsersStore } from './useOnlineUsersStore';
import { useMessagesStore } from './useMessagesStore';
import { useSound } from '~/composables/useSound';

// This interface should match the 'connection-established' event payload from your server
export interface SocketCurrentUser {
  userId: string;
  name: string;
  socketId: string;
  role: 'admin' | 'user';
}

export const useSocketStore = defineStore('socket', () => {
  // --- DEPENDENCIES ---
  const userStore = useUserStore();
  const onlineUsersStore = useOnlineUsersStore();
  const sound = useSound();
  const config = useRuntimeConfig();

  // --- STATE ---
  const socket = ref<Socket | null>(null);
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const connectionError = ref<string | null>(null);
  const currentUser = ref<SocketCurrentUser | null>(null); // User data from the socket server
  const transport = ref<'polling' | 'websocket' | "webtransport" | 'N/A'>('N/A');

  // --- GETTERS ---
  const getConnectionStatus = computed(() => isConnected.value);

  // --- HELPERS ---
  async function getCookieStringForCapacitor(): Promise<string> {
    if (!Capacitor.isNativePlatform()) return '';
    try {
      const { CapacitorCookies } = await import('@capacitor/core');
      const cookies = await CapacitorCookies.getCookies();
      return Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    } catch (e) {
      console.error('Error getting cookies in Capacitor:', e);
      return '';
    }
  }

  // --- ACTIONS ---

  /**
   * Initializes the socket connection.
   * This function is now idempotent and safe to call multiple times.
   * It will only proceed if a user is logged in and a connection isn't already active.
   */
  async function initializeSocket() {
    // 1. Guard Clauses: Don't connect if not logged in or already connected/connecting.
    if (!userStore.isLoggedIn) {
      console.warn('Socket connection aborted: User is not logged in.');
      return;
    }
    if (socket.value?.connected || isConnecting.value) {
      console.log('Socket connection already active or in progress.');
      return;
    }
    
    // If a socket instance exists but is disconnected, just reconnect.
    if (socket.value) {
        console.log("Socket instance exists, attempting to connect...");
        isConnecting.value = true;
        socket.value.connect();
        return;
    }

    console.log('Initializing new socket instance...');
    isConnecting.value = true;

    // 2. Connection Options
    const options: any = {
      withCredentials: true, // Crucial for sending HTTP-only cookies
      autoConnect: false, // We explicitly call .connect()
      // Add connection state recovery options from your server config
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
      },
      // reconnection: true, // Enable automatic reconnection
      // reconnectionAttempts: 5, // Limit reconnection attempts
      // reconnectionDelay: 1000, // Initial delay between attempts (ms)
      // reconnectionDelayMax: 5000, // Max delay with exponential backoff
      // // transports: ["websocket", "polling"],
      // tryAllTransports: true,
    };

    // For Capacitor, we might need to manually attach cookies if `withCredentials` isn't enough.
    if (Capacitor.isNativePlatform()) {
      const cookieString = await getCookieStringForCapacitor();
      if (cookieString) {
        options.extraHeaders = { cookie: cookieString };
        console.log('Attached cookies for Capacitor platform.');
      }
    }

    // 3. Create and Connect
    const newSocket = io(config.public.originUrl, options);
    socket.value = newSocket;

    bindBaseEvents();
    
    console.log('Attempting to connect socket...');
    newSocket.connect();
  }

  /**
   * Binds the core socket lifecycle events. This is called once per socket instance.
   */
  function bindBaseEvents() {
    if (!socket.value) return;

    // --- Connection Lifecycle Events ---
    socket.value.on('connect', () => {
      console.log('Socket connected successfully!');
      isConnected.value = true;
      isConnecting.value = false;
      connectionError.value = null;
      transport.value = socket.value?.io.engine.transport.name as any;
      sound.playSound('connect');
    });

    socket.value.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      isConnected.value = false;
      isConnecting.value = false;
      currentUser.value = null;
      onlineUsersStore.clearUsers();
      transport.value = 'N/A';
      if (reason === 'io server disconnect') {
        connectionError.value = 'Disconnected by server. Your session may have expired.';
        // The server rejected the connection, likely due to an invalid token.
        // Clear the user state to force a re-login.
        userStore.clearUser();
      }
      sound.playSound('disconnect');
    });

    socket.value.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      isConnected.value = false;
      isConnecting.value = false;
      connectionError.value = error.message;
      
      // If the error is an authentication error from your server middleware, log the user out.
      if (['Authentication required', 'Token validation failed', 'Invalid authentication'].includes(error.message)) {
          console.error("Authentication failed. Clearing user session.");
          userStore.clearUser(); // This will trigger a logout flow
      }

      sound.playSound('error');
    });

    // --- Core Application Events (from your server) ---
    socket.value.on('connection-established', (data: SocketCurrentUser) => {
      console.log('Connection established, user data received:', data);
      currentUser.value = data;
    });
    
    socket.value.on('online-users', (users) => {
      onlineUsersStore.setUsers(users);
    });

    socket.value.on('user-joined', (user) => {
      onlineUsersStore.addUser(user);
    });

    socket.value.on('user-left', (userId) => {
      onlineUsersStore.removeUser(userId);
    });
  }

  /**
   * Manually disconnects the socket. This should be called on user logout.
   */
  function disconnectSocket() {
    if (socket.value?.connected) {
      console.log('Disconnecting socket manually...');
      socket.value.disconnect();
    }
    // Clear all state regardless
    isConnected.value = false;
    isConnecting.value = false;
    currentUser.value = null;
    connectionError.value = null;
    socket.value = null;
  }

  // --- Return Public API ---
  return {
    // State & Getters
    isConnected: getConnectionStatus,
    isConnecting,
    connectionError,
    currentUser,
    socket, // Expose for advanced use cases like WebRTC
    // Actions
    initializeSocket,
    disconnectSocket,
    // You can add `bindChatEvents`, `bindGameEvents` etc. here as your app grows
  };
});
