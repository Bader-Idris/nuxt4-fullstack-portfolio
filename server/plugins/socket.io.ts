import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { defineEventHandler } from "h3";
import { isTokenValid } from "../utils/jwt";
import { Message } from "../models/mongo";
// with multi replicas
import { createAdapter } from "@socket.io/redis-streams-adapter"; // official says: better than @socket.io/redis-adapter
import { createClient } from "redis";

export default defineNitroPlugin(async (nitroApp: NitroApp) => { 
  if ( process.env.NODE_ENV === "development" || process.env.NODE_ENV === "production" ) {
    // If one replica, you can remove these redis related settings!
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const redisClient = createClient({ url: redisUrl });
    // Connect to Redis
    try {
      await redisClient.connect();
      console.log("✅ Connected to Redis");
    } catch (error) {
      console.error("❌ Failed to connect to Redis:", error);
      return; // Prevent Socket.IO from starting if Redis fails
    }
    const adapter = createAdapter(redisClient);

    const engine = new Engine();
    // const io = new Server();
    const io = new Server({
      // adapter for multi replicas
      adapter,
      cors: {
        origin: useRuntimeConfig().public.originUrl,
        // methods: ["GET", "POST"], // defaults to all methods
        credentials: true,
      },
      // https://socket.io/how-to/deal-with-cookies#cookie-based-sticky-session
      cookie: {
        name: "io", // name it based on the nginx one if you're using ip approach! I use the official redis streaming adapter approach
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true, // Skip middlewares on recovery
      },
    });

    io.bind(engine);

    // Store connected users
    const connectedUsers = new Map();

    // Middleware to handle authentication
    io.use(async (socket, next) => {
      try {
        // socket.handshake.headers.cookie, // ✅ string!
        const accessToken = socket.handshake.headers.cookie
          ?.split("; ")
          .find((cookie) => cookie.startsWith("accessToken="))
          ?.split("=")[1];

        if (!accessToken) {
          return next(new Error("Authentication required"));
        }

        // Verify the token
        const decoded = isTokenValid(accessToken);

        if (!decoded) {
          return next(new Error("Token validation failed"));
        }

        // Store user info in socket
        socket.data.user = decoded.user;

        // Proceed with connection
        next();
      } catch (error) {
        console.error("Authentication error:", error);
        return next(new Error("Invalid authentication"));
      }
    });

    io.on("connection", (socket) => {
      const user = socket.data.user;
      // TODO: get rid of these logs in prod!
      console.log(`User connected: ${user.name} (${user.userId})`);

      // Add user to connected users map
      connectedUsers.set(user.userId, {
        socketId: socket.id,
        name: user.name,
        role: user.role,
        userId: user.userId,
      });

      // Send socket ID and user info to the client
      socket.emit("connection-established", {
        socketId: socket.id,
        userId: user.userId,
        name: user.name,
        role: user.role,
      });

      // Emit updated online users list to admins
      const onlineUsers = Array.from(connectedUsers.values());
      io.to("admin-room").emit("online-users", { users: onlineUsers });

      // Join rooms based on user role
      socket.join(`user-${user.userId}`);
      // TODO: might wanna add more complex rooming
      if (user.role === "admin") {
        socket.join("admin-room");
      }

      // Handle user call request to admin
      socket.on("call-request-to-admin", () => {
        if (user.role !== "user") return; // TODO: add more roles
        io.to("admin-room").emit("call-request-notification", {
          from: user.userId,
          name: user.name,
        });
      });

      // Handle WebRTC signaling // TODO: do we need udp configs in our dockerized setup?
      socket.on("call-request", (data) => {
        const targetSocketId = connectedUsers.get(data.to)?.socketId;
        if (targetSocketId) {
          io.to(targetSocketId).emit("call-request", {
            from: user.userId,
            name: user.name,
            sdp: data.sdp,
          });
        }
      });

      socket.on("call-answer", (data) => {
        const targetSocketId = connectedUsers.get(data.to)?.socketId;
        if (targetSocketId) {
          io.to(targetSocketId).emit("call-answer", {
            from: user.userId,
            sdp: data.sdp,
          });
        }
      });

      socket.on("ice-candidate", (data) => {
        const targetSocketId = connectedUsers.get(data.to)?.socketId;
        if (targetSocketId) {
          io.to(targetSocketId).emit("ice-candidate", {
            from: user.userId,
            candidate: data.candidate,
          });
        }
      });

      socket.on("end-call", (data) => {
        const targetSocketId = connectedUsers.get(data.to)?.socketId;
        if (targetSocketId) {
          io.to(targetSocketId).emit("end-call", {
            from: user.userId,
          });
        }
      });

      socket.on("private-message", async (data) => {
        const { to, message, timestamp } = data;
        const fromUser = socket.data.user.userId;

        // Save to database
        const newMessage = new Message({
          from: fromUser,
          to,
          message,
          timestamp,
        });
        await newMessage.save();

        // Forward to recipient
        const targetSocketId = connectedUsers.get(to)?.socketId;
        if (targetSocketId) {
          // TODO: make it more professional
          io.to(targetSocketId).emit("private-message", {
            from: fromUser,
            fromName: socket.data.user.name,
            message,
            timestamp,
            id: newMessage._id, // how to properly get this _id
          });
        }
      });

      // Handle message history retrieval
      socket.on("get-message-history", async (data) => {
        if (!user.userId) {
          socket.emit("error", { message: "User not authenticated" });
          return;
        }

        const { page = 1, limit = 20 } = data; // Default to page 1, 20 messages per page
        try {
          const messages = await Message.find({
            $or: [
              { from: user.userId }, // Messages sent by the user
              { to: user.userId }, // Messages received by the user
              { isBroadcast: true }, // Broadcast messages
            ],
          })
            .sort({ timestamp: -1 }) // Sort by timestamp, most recent first
            .skip((page - 1) * limit) // Skip messages for previous pages
            .limit(limit); // Limit the number of messages returned

          socket.emit("message-history", messages);
        } catch (error) {
          console.error("Error fetching messages:", error);
          socket.emit("error", { message: "Failed to fetch messages" });
        }
      });

      socket.on("message-to-admin", async (data) => {
        const { message, timestamp } = data;
        const fromUser = socket.data.user.userId;

        // Save message for each admin
        const admins = Array.from(connectedUsers.values()).filter(
          (u) => u.role === "admin"
        );
        for (const admin of admins) {
          const newMessage = new Message({
            from: fromUser,
            to: admin.userId,
            message,
            timestamp,
            // TODO: do we need to store ip address?
          });
          await newMessage.save();
        }

        // Forward to admin room
        io.to("admin-room").emit("private-message", {
          from: fromUser,
          fromName: socket.data.user.name,
          message,
          timestamp,
        });
      });

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

      socket.on("get-message-history", async () => {
        const userId = socket.data.user.userId;
        const messages = await Message.find({
          $or: [{ from: userId }, { to: userId }, { isBroadcast: true }],
        }).sort({ timestamp: 1 });
        socket.emit("message-history", messages);
      });

      socket.on("disconnect", () => {
        console.log(`User disconnected: ${user.name} (${user.userId})`);
        connectedUsers.delete(user.userId);

        // Emit updated online users list to admins
        const onlineUsers = Array.from(connectedUsers.values());
        io.to("admin-room").emit("online-users", { users: onlineUsers });
      });

      // Handle get-online-users request (for admins)
      socket.on("get-online-users", () => {
        if (user.role === "admin") {
          const onlineUsers = Array.from(connectedUsers.values());
          socket.emit("online-users", { users: onlineUsers });
        }
      });
    });

    nitroApp.router.use(
      "/socket.io/",
      defineEventHandler({
        handler(event) {
          engine.handleRequest(event.node.req, event.node.res);
          event._handled = true;
        },
        websocket: {
          open(peer) {
            // @ts-expect-error private method and property
            engine.prepare(peer._internal.nodeReq);
            // @ts-expect-error private method and property
            engine.onWebSocket( peer._internal.nodeReq, peer._internal.nodeReq.socket, peer.websocket
            );
          },
        },
      })
    );
  } else {
    console.log("⚠️ Skipping Socket io connection during build phase");
  }
});
