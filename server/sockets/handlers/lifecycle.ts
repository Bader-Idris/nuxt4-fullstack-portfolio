import { Server, Socket } from "socket.io";
import {
  addOnlineUserToRedis,
  removeOnlineUserFromRedis,
  getOnlineUsersFromRedis,
} from "../state";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "../types";

export const handleConnection = async (
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
  try {
    const user = socket.data?.user;

    // Extract io cookie (deviceId) for multi-device tracking, as per Nginx config
    const deviceId = socket.handshake.headers.cookie
      ?.split("; ")
      .find((cookie) => cookie.startsWith("io="))
      ?.split("=")[1];

    if (!user || !user.userId) {
      console.warn(
        `Connection rejected: Missing user data. Socket ID: ${socket.id}`,
      );
      socket.disconnect();
      return;
    }

    // TODO: get rid of these logs in prod!
    console.log(
      `User connected: ${user.name} (${user.userId}) from device: ${deviceId}`,
    );

    // Add user to Redis and get the user data
    const userData = await addOnlineUserToRedis(user, socket.id, deviceId);

    if (!userData) {
      socket.disconnect();
      return;
    }

    // Check connection count for broadcasting (we need to check Redis again or change addOnlineUserToRedis)
    // For now, let's just broadcast every join or check if it's the first connection elsewhere.
    // Actually, getOnlineUsersFromRedis will show the user if added.
    const currentOnlineUsers = await getOnlineUsersFromRedis();
    const userConnectionCount = currentOnlineUsers.filter(u => u.userId === user.userId).length;

    if (userConnectionCount === 1) {
      // Emit updated online users list ONLY if this was their first connection
      socket.broadcast.emit("user-joined", {
        userId: userData.userId,
        socketId: userData.socketId,
        name: userData.name,
        role: userData.role,
        avatar: userData.avatar,
        avatarHash: userData.avatarHash,
      });
    }

    // Send socket ID and user info to the client
    socket.emit("connection-established", {
      socketId: socket.id,
      userId: userData.userId,
      name: userData.name,
      role: userData.role,
      avatar: userData.avatar,
      avatarHash: userData.avatarHash,
    });

    // Send current online users list to the newly connected user (INCLUDING THEMSELVES)
    socket.emit("online-users", currentOnlineUsers);

    // Join rooms based on user role
    socket.join(`user-${user.userId}`);
    // TODO: might wanna add more complex rooming
    if (user.role === "admin") {
      socket.join("admin-room");
    }

    socket.on("disconnect", async (reason) => {
      const disconnectedUser = socket.data?.user;
      if (disconnectedUser && disconnectedUser.userId) {
        console.log(
          `User disconnected: ${disconnectedUser.name} (${disconnectedUser.userId}) - Reason: ${reason}`,
        );

        // Remove from Redis and check if this was the last connection
        const isLastConnection = await removeOnlineUserFromRedis(
          disconnectedUser.userId,
          socket.id,
        );

        if (isLastConnection) {
          // Notify all other users that this user has left ONLY if they have no more active connections
          socket.broadcast.emit("user-left", disconnectedUser.userId);
        }
      }
    });
  } catch (error) {
    console.error("Error in socket connection handler:", error);
    socket.disconnect();
  }
};