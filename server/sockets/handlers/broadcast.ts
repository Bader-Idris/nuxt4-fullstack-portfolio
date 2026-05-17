import { Server, Socket } from "socket.io";
import { Message } from "../../models/mongo";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "../types";

export const registerBroadcastHandlers = (
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
  socket.on("broadcast", async (data) => {
    // TODO: how to save video and audio broadcasts, do we need cloudinary?
    const { message, timestamp } = data;
    const fromUser = socket.data.user.userId;

    // Save message to database
    const newMessage = new Message({
      from: fromUser,
      message,
      timestamp,
      isBroadcast: true,
    });
    await newMessage.save();

    // Send to all clients
    io.emit("broadcast", {
      from: fromUser,
      fromName: socket.data.user.name,
      message,
      timestamp,
      // TODO: test out
      id: newMessage._id,
    });
  });
};