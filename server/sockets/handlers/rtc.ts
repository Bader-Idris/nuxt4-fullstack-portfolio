import { Server, Socket } from "socket.io";
import { isUserOnline } from "../state";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "../types";

export const registerRTCHandlers = (
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

  socket.on("call-offer", async (data) => {
    const { to, offer, callType } = data;
    // Check if user is online using Redis directly (no array scans)
    const isOnline = await isUserOnline(to);

    if (isOnline) {
      io.to(`user-${to}`).emit("call-offer", {
        from: user.userId,
        fromName: user.name,
        offer,
        callType,
      });
    } else {
      socket.emit("error", { message: "User not online" });
    }
  });

  socket.on("call-answer", async (data) => {
    const { to, answer, callType } = data;
    const isOnline = await isUserOnline(to);

    if (isOnline) {
      io.to(`user-${to}`).emit("call-answer", {
        from: user.userId,
        answer,
        callType,
      });
    }
  });

  socket.on("ice-candidate", async (data) => {
    const { to, candidate } = data;
    const isOnline = await isUserOnline(to);

    if (isOnline) {
      io.to(`user-${to}`).emit("ice-candidate", {
        from: user.userId,
        candidate,
      });
    }
  });

  socket.on("call-declined", async (data) => {
    const { to, reason } = data;
    const isOnline = await isUserOnline(to);

    if (isOnline) {
      io.to(`user-${to}`).emit("call-declined", {
        from: user.userId,
        fromName: user.name,
        reason,
      });
    }
  });

  socket.on("call-ended", async (data) => {
    const { to } = data;
    const isOnline = await isUserOnline(to);

    if (isOnline) {
      io.to(`user-${to}`).emit("call-ended", {
        from: user.userId,
        fromName: user.name,
      });
    }
  });
};