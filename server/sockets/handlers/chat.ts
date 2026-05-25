import { Server, Socket } from "socket.io";
import { Message } from "../../models/mongo";
import { redisClient } from "../../plugins/redis";
import {
  getSubscription,
  getCapacitorSubscription,
} from "../../utils/redisUtils";
import { sendAPN, sendFCM } from "../../utils/push";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "../types";

export const registerChatHandlers = (
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
  webpush: any,
) => {
  const fromUser = socket.data.user;

  socket.on("private-message", async (data) => {
    // TODO: we can implement profanity control to filter bad words
    const { to, message, timestamp } = data;

    if (!fromUser || !fromUser.userId) {
      // Handle unauthenticated user trying to send a message
      return;
    }

    // Save to database first
    const newMessage = new Message({
      from: fromUser.userId,
      to,
      message,
      timestamp,
    });
    await newMessage.save();

    const messageData = {
      from: fromUser.userId,
      fromName: fromUser.name,
      to,
      message,
      timestamp,
      id: newMessage._id.toString(),
    };

    // Echo the message back to the sender immediately
    socket.emit("private-message", messageData);

    // Check if the recipient is online in any instance
    const recipientSockets = await io.in(`user-${to}`).fetchSockets();

    if (recipientSockets && recipientSockets.length > 0) {
      // User is online, send the message via Socket.IO to their room
      io.to(`user-${to}`).emit("private-message", messageData);
      console.log(`Message delivered to ${to} via Socket.IO`);
    } else {
      // User is offline, send a push notification
      console.log(
        `User ${to} is offline, attempting to send push notification.`,
      );
      try {
        // Web push
        const subscription = await getSubscription(redisClient!, to);
        if (subscription) {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: `New message from ${fromUser.name}`,
              body: message,
              url: "/dashboard",
              data: { action: "open_chat", fromUserId: fromUser.userId },
            }),
          );
          console.log(`Push notification sent successfully to ${to}`);
        } else {
          console.log(`No web push subscription found for user ${to}`);
        }

        // Capacitor push
        const capacitorSubscription = await getCapacitorSubscription(
          redisClient!,
          to,
        );
        if (capacitorSubscription) {
          const { token, platform } = capacitorSubscription;
          const payload = {
            title: `New message from ${fromUser.name}`,
            body: message,
            from: fromUser.userId,
          };
          if (platform === "ios") {
            await sendAPN(token, payload);
          } else if (platform === "android") {
            await sendFCM(token, payload);
          }
          console.log(`Capacitor push notification sent successfully to ${to}`);
        } else {
          console.log(`No Capacitor push subscription found for user ${to}`);
        }
      } catch (err) {
        console.error(`Failed to send push notification to ${to}:`, err);
      }
    }
  });

  // Handle message history retrieval
  socket.on("get-message-history", async (data, callback) => {
    const user = socket.data.user;
    if (!user || !user.userId) {
      return callback({ error: "User not authenticated" });
    }

    const { recipientId, page = 1, limit = 20 } = data;
    if (!recipientId) {
      return callback({ error: "Recipient ID is required" });
    }

    if (typeof page !== "number" || page < 1 || !Number.isInteger(page)) {
      return callback({ error: "Invalid page number" });
    }

    try {
      const messages = await Message.find({
        $or: [
          { from: user.userId, to: recipientId },
          { from: recipientId, to: user.userId },
        ],
      })
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("from", "name") // Populate sender's name
        .lean(); // Use lean for better performance

      // Reverse the messages to show the latest at the bottom
      const formattedMessages = messages.reverse().map((msg) => ({
        ...msg,
        fromName: (msg.from as any).name, // Extract populated name
        from: (msg.from as any)._id.toString(), // Ensure 'from' is the string ID
        id: msg._id.toString(),
      }));

      socket.emit("message-history", {
        recipientId,
        messages: formattedMessages,
      });
      if (callback) callback({ messages: formattedMessages });
    } catch (error) {
      console.error("Error fetching messages:", error);
      if (callback) callback({ error: "Failed to fetch messages" });
    }
  });

  // Handle updating the last active chat recipient
  socket.on("update-active-chat", async (recipientId: string) => {
    const user = socket.data.user;
    if (!user || !user.userId) return;

    try {
      const { User } = await import("../../models/mongo/User");
      await User.findByIdAndUpdate(user.userId, { lastActiveChat: recipientId });
    } catch (error) {
      console.error("Error updating active chat:", error);
    }
  });
};