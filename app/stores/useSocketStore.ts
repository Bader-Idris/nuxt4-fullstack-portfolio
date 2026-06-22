import { defineStore } from "pinia";
import { io, type Socket } from "socket.io-client";
import { Capacitor, CapacitorCookies } from "@capacitor/core";
import { useOnlineUsersStore } from "./useOnlineUsersStore";
import { useMessagesStore } from "./useMessagesStore";
import { useSound } from "~/composables/useSound";
import { useUserStore } from "./useUserSocket";

export interface SocketCurrentUser {
  userId: string;
  name: string;
  socketId: string;
  role: "admin" | "user" | "guest" | "editor" | "premium";
  avatar?: string;
  avatarHash?: string;
}

export const useSocketStore = defineStore("socket", () => {
  // --- DEPENDENCIES ---
  const onlineUsersStore = useOnlineUsersStore();
  const sound = useSound();
  const config = useRuntimeConfig();

  // --- STATE ---
  const socket = ref<Socket | null>(null);
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const connectionError = ref<string | null>(null);
  const currentUser = ref<SocketCurrentUser | null>(null);
  const transport = ref<"polling" | "websocket" | "webtransport" | "N/A">(
    "N/A",
  );
  let initializationPromise: Promise<void> | null = null;

  // --- GETTERS ---
  const getConnectionStatus = computed(() => isConnected.value);

  // --- HELPERS ---
  async function _getCookieStringForCapacitor(): Promise<string> {
    if (!Capacitor.isNativePlatform()) return "";
    try {
      let cookies: Record<string, string> = {};
      // Retry up to 5 times with a 100ms delay to allow native cookie jar to sync
      for (let attempt = 1; attempt <= 5; attempt++) {
        cookies = await CapacitorCookies.getCookies({ url: config.public.originUrl });
        if (cookies && cookies.accessToken) {
          break;
        }
        // Fallback check
        cookies = await CapacitorCookies.getCookies();
        if (cookies && cookies.accessToken) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join("; ");
    } catch (e) {
      console.error("Error getting cookies in Capacitor:", e);
      return "";
    }
  }

  // --- ACTIONS ---
  function initializeSocket(): Promise<void> {
    if (socket.value?.connected) return Promise.resolve();
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
      if (socket.value) {
        isConnecting.value = true;
        socket.value.connect();
        return;
      }

      console.log("Initializing new socket instance...");
      isConnecting.value = true;

      let cookieString = "";
      if (Capacitor.isNativePlatform()) {
        cookieString = await _getCookieStringForCapacitor();
      }

      const options: any = {
        withCredentials: true,
        autoConnect: false,
        connectionStateRecovery: {
          maxDisconnectionDuration: 2 * 60 * 1000,
          skipMiddlewares: true,
        },
      };

      if (cookieString) {
        options.extraHeaders = {
          cookie: cookieString,
        };
        options.transportOptions = {
          polling: {
            extraHeaders: {
              cookie: cookieString,
            },
          },
        };
      }

      const newSocket = io(config.public.socketUrl, options);
      socket.value = newSocket;

      bindBaseEvents();
      newSocket.connect();
    })();

    initializationPromise.finally(() => {
      initializationPromise = null;
    });

    return initializationPromise;
  }

  function bindBaseEvents() {
    if (!socket.value) return;

    socket.value.on("connect", () => {
      console.log("Socket connected successfully!");
      isConnected.value = true;
      isConnecting.value = false;
      connectionError.value = null;
      transport.value = socket.value?.io.engine.transport.name as any;
      sound.playSound("connect");
    });

    socket.value.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      isConnected.value = false;
      isConnecting.value = false;
      transport.value = "N/A";

      // CRITICAL FIX: Only clear the user session if the server explicitly kicks them out.
      // This prevents logging out on a temporary network failure.
      if (reason === "io server disconnect") {
        console.error("Disconnected by server, session is likely invalid.");
        connectionError.value =
          "Disconnected by server. Your session may have expired.";
        currentUser.value = null;
        onlineUsersStore.clearUsers();

        // Use the user store to properly clear the user session.
        const userStore = useUserStore();
        userStore.clearUser();
      }
      // For other reasons like 'transport close', we just show 'Disconnected' and allow auto-reconnect.
      sound.playSound("disconnect");
    });

    socket.value.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      isConnected.value = false;
      isConnecting.value = false;
      connectionError.value = error.message;
      // sound.playSound("error");
      // A failed socket connection should not automatically log the user out.
      // The UI should display the connection error, and socket.io will handle reconnection attempts.
    });

    socket.value.on("connection-established", (data: SocketCurrentUser) => {
      currentUser.value = data;
    });

    socket.value.on("online-users", (users) => {
      onlineUsersStore.setUsers(users);
    });

    socket.value.on("user-joined", (user) => {
      onlineUsersStore.addUser(user);
    });

    socket.value.on("user-left", (userId) => {
      onlineUsersStore.removeUser(userId);
    });

    const messagesStore = useMessagesStore();
    socket.value.on("private-message", (message) => {
      messagesStore.addMessage(message);
      const userStore = useUserStore();
      if (message.from !== userStore.getUserId) {
        sound.playSound("newMessage");
      }
    });

    socket.value.on("message-history", ({ recipientId, messages }) => {
      messagesStore.setMessages(recipientId, messages);
    });
  }

  function disconnectSocket() {
    if (socket.value) {
      console.log("Disconnecting socket manually...");
      socket.value.disconnect();
    }
    socket.value = null;
    initializationPromise = null;
    isConnected.value = false;
    isConnecting.value = false;
    currentUser.value = null;
    connectionError.value = null;
  }

  function sendPrivateMessage(recipientId: string, message: string) {
    socket.value?.emit("private-message", {
      to: recipientId,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  function fetchMessageHistory(
    recipientId: string,
    page: number,
    limit: number,
  ) {
    socket.value?.emit("get-message-history", { recipientId, page, limit });
  }

  return {
    isConnected: getConnectionStatus,
    isConnecting,
    connectionError,
    currentUser,
    socket,
    transport,
    initializeSocket,
    disconnectSocket,
    sendPrivateMessage,
    fetchMessageHistory,
  };
});