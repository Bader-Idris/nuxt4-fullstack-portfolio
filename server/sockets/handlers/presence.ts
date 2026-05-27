import { Server, Socket } from "socket.io";
import { getOnlineUsersFromRedis } from "../state";
import { getContacts } from "../../utils/getContacts";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "../types";

export const registerPresenceHandlers = (
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
) => {
  const user = socket.data.user;

  socket.on("get-contacts", async (data, callback) => {
    if (!user || !user.userId) {
      if (callback) callback({ error: "User not authenticated" });
      return;
    }

    const { page = 1, limit = 20 } = data || {};

    try {
      const contacts = await getContacts(user.userId, page, limit);
      if (callback) callback({ contacts });
    } catch (error) {
      console.error("Error fetching contacts:", error);
      if (callback) callback({ error: "Failed to fetch contacts" });
    }
  });

  // Handle online users request
  socket.on("get-online-users", async (data, callback) => {
    try {
      const onlineUsers = await getOnlineUsersFromRedis();
      if (callback) callback({ users: onlineUsers });
    } catch (error) {
      console.error("Error fetching online users:", error);
      if (callback) callback({ error: "Failed to fetch online users" });
    }
  });

  // Track user location for targeted notifications (e.g. only push if NOT on dashboard)
  socket.on("enter-page", (pageName) => {
    socket.join(`page-${pageName}`);
    console.log(`User ${user.userId} entered page: ${pageName}`);
  });

  socket.on("leave-page", (pageName) => {
    socket.leave(`page-${pageName}`);
    console.log(`User ${user.userId} left page: ${pageName}`);
  });
};