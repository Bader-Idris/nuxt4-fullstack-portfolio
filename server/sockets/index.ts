import { Server, Socket } from "socket.io";
import { authMiddleware } from "./middleware";
import { handleConnection } from "./handlers/lifecycle";
import { registerRTCHandlers } from "./handlers/rtc";
import { registerChatHandlers } from "./handlers/chat";
import { registerPresenceHandlers } from "./handlers/presence";
import { registerBroadcastHandlers } from "./handlers/broadcast";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "./types";

/**
 * Main function to initialize all socket logic.
 * Professionally organized by topic for better maintainability.
 */
export const initSocketHandlers = (
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  webpush: any,
) => {
  // 1. Apply Authentication Middleware
  io.use(authMiddleware);

  // 2. Handle Connection
  io.on(
    "connection",
    async (
      socket: Socket<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
      >,
    ) => {
      // A. Lifecycle (connection/disconnection, redis state, joining rooms)
      await handleConnection(io, socket);

      // B. RTC / Video Calling
      registerRTCHandlers(io, socket);

      // C. Messaging & History
      registerChatHandlers(io, socket, webpush);

      // D. User Presence & Contacts
      registerPresenceHandlers(io, socket);

      // E. Global Broadcast
      registerBroadcastHandlers(io, socket);
    },
  );
};

export * from "./state";
export * from "./rate-limiters";
export * from "./middleware";
export * from "./constants";