import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { defineEventHandler, createError } from "h3";
import { isTokenValid } from "../utils/jwt";
import { Message } from "../models/mongo";
// docs: https://github.com/animir/node-rate-limiter-flexible/wiki/Overall-example#websocket-single-connection-prevent-flooding
import { RateLimiterRedis } from "rate-limiter-flexible";
import { redisClient } from "./redis";
// with multi replicas
import { createAdapter } from "@socket.io/redis-streams-adapter"; // official says: better than @socket.io/redis-adapter

import createWebPushInstance from "../utils/webPush";
import { getSubscription } from "../utils/redisUtils";
// for future organizing
// import * from '.././sockets'

export default defineNitroPlugin(async (nitroApp: NitroApp) => { 
  if ( process.env.NODE_ENV === "development" || process.env.NODE_ENV === "production" ) {
    // --- START: Production-Ready Rate Limiters ---
    const maxPointsPerSecond = 5; // General limit per IP per second
    const maxPointsPerMinute = 50; // Stricter limit for expensive actions

    // 1. Connection Rate Limiter (per IP)
    // Limits how many times a single IP can attempt to connect per second.
    // This is your first defense against connection floods.
    const connectionLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "limit_conn_ip",
      points: maxPointsPerSecond,
      duration: 1, // Per 1 second
      blockDuration: 60 * 10, // Block for 10 minutes if consumed more than points
    });

    // 2. High-Cost Action Limiter (per User ID)
    // Stricter limit for resource-intensive events like creating or starting a game.
    // We use the User ID to prevent one user from spamming these actions.
    const gameActionLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "limit_game_action_user",
      points: 5, // Only 5 expensive actions...
      duration: 60, // ...per minute
    });

    // 3. General Event Limiter (per User ID)
    // A more lenient limiter for frequent events like chat messages or hitting the buzzer.
    const generalEventLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "limit_event_user",
      points: maxPointsPerMinute,
      duration: 60, // Per 1 minute
    });
    // --- END: Production-Ready Rate Limiters ---

    const webpush = createWebPushInstance();

    // Access the Redis storage that was mounted in another plugin
    // const redisStorage = useStorage("redis");
    // // Example of using redisStorage
    // await redisStorage.setItem("socket:status", "initialized");

    // This is The Way to Use Redis without getting errors from the Adapter!
    const adapter = createAdapter(redisClient);

    const engine = new Engine();
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
        secure: process.env.NODE_ENV === "production",
        // expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true, // Skip middlewares on recovery
      },
      maxHttpBufferSize: 1e6, // might need to increase with streaming, DDoS can affect it!
      // transports: ["polling", "websocket", "webtransport"], // might want to allow webtransport, due to its websocket fixes
      // transports: ["websocket", "polling"],
    });

    io.bind(engine);

    // Store connected users
    const userSockets = new Map();

    // Middleware to handle authentication
    io.use(async (socket, next) => {
      try {
        // socket.handshake.headers.cookie, // ✅ string!
        const accessToken = socket.handshake.headers.cookie
          ?.split("; ")
          .find((cookie) => cookie.startsWith("accessToken="))
          ?.split("=")[1];

        if (!accessToken) {
          // TODO: it does not throw the status code
          return next(
            createError({
              statusCode: 401,
              statusMessage: "Authentication required",
            })
          );
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
        return next(
          createError({
            statusCode: 401,
            statusMessage: "Invalid authentication",
          })
        );
      }
    });

    io.on("connection", (socket) => {
      const user = socket.data.user;
      // TODO: get rid of these logs in prod!
      console.log(`User connected: ${user.name} (${user.userId})`);

      // if (user && user.userId) {} // TODO: would it be useful to add a check here?
      // Add user to connected users map
      userSockets.set(user.userId, {
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

      const onlineUsers = Array.from(userSockets.entries())
        // .filter(([userId]) => userId !== socket.data.user.userId) // Exclude current user
        .map(([userId, data]) => ({
          userId,
          socketId: data.socketId,
          name: data.name,
          role: data.role,
        }));
      socket.emit("online-users", onlineUsers);

      // Emit updated online users list to admins
      // const onlineUsers = Array.from(userSockets.values());
      // io.to("admin-room").emit("online-users", { users: onlineUsers });

      // Emit updated online users list to all users
      socket.broadcast.emit("user-joined", {
        userId: user.userId,
        socketId: socket.id,
        name: user.name,
        role: user.role,
      });

      // Join rooms based on user role
      socket.join(`user-${user.userId}`);
      // TODO: might wanna add more complex rooming
      if (user.role === "admin") {
        socket.join("admin-room");
      }

      socket.on("disconnect", () => {
        if (user && user.userId) {
          console.log(`User disconnected: ${user.name} (${user.userId})`);
          userSockets.delete(user.userId);

          io.emit("user-left", user.userId); // TODO: would it be nice to emit this to all users?

          // Emit updated online users list to admins
          // const onlineUsers = Array.from(userSockets.values());
          // io.to("admin-room").emit("online-users", { users: onlineUsers });
        }
      });

      socket.on("call-offer", (data) => {
        const { to, offer } = data;
        const targetSocketId = userSockets.get(to)?.socketId;
        if (targetSocketId) {
          io.to(targetSocketId).emit("call-offer", {
            from: user.userId,
            fromName: user.name,
            offer,
          });
        } else {
          socket.emit("error", { message: "User not online" });
        }
      });

      socket.on("call-answer", (data) => {
        const { to, answer } = data;
        const targetSocketId = userSockets.get(to)?.socketId;
        if (targetSocketId) {
          io.to(targetSocketId).emit("call-answer", {
            from: user.userId,
            answer,
          });
        }
      });

      socket.on("ice-candidate", (data) => {
        const { to, candidate } = data;
        const targetSocketId = userSockets.get(to)?.socketId;
        if (targetSocketId) {
          io.to(targetSocketId).emit("ice-candidate", {
            from: user.userId,
            candidate,
          });
        }
      });

      socket.on("call-declined", (data) => {
        const { to } = data;
        const targetSocketId = userSockets.get(to)?.socketId;
        if (targetSocketId) {
          io.to(targetSocketId).emit("call-declined", {
            from: user.userId,
            fromName: user.name,
          });
        }
      });

      socket.on("call-ended", (data) => {
        const { to } = data;
        const targetSocketId = userSockets.get(to)?.socketId;
        if (targetSocketId) {
          io.to(targetSocketId).emit("call-ended", {
            from: user.userId,
            fromName: user.name,
          });
        }
      });

      socket.on("private-message", async (data) => {
        const { to, message, timestamp } = data;
        const fromUser = socket.data.user.userId;
        const targetSocketId = userSockets.get(to)?.socketId;

        // Save to database
        const newMessage = new Message({
          from: fromUser,
          to,
          message,
          timestamp,
        });
        await newMessage.save();

        const messageData = {
          from: fromUser,
          fromName: socket.data.user.name,
          message,
          timestamp,
          id: newMessage._id, // how to properly get this _id
        };

        // Forward to recipient
        if (targetSocketId) {
          // Target is online, send via Socket.IO with ack
          io.to(targetSocketId).emit("private-message", messageData, (ack) => {
            if (ack) {
              console.log(`Message delivered to ${to} via Socket.IO`);
            } else {
              console.log(`Message to ${to} not acknowledged`);
            }
          });
        } else {
          // Target is offline, send push notification
          // const subscription = await getSubscription(to);
          const redis = redisClient; // TODO: or event.context.redis
          const subscription = await getSubscription(redis, to);
          if (subscription) {
            try {
              await webpush.sendNotification(
                subscription,
                JSON.stringify({
                  title: "New Message",
                  body: `You have a new message from ${socket.data.user.name}`,
                  url: "/dashboard", // Add URL for click handling
                })
              );
              console.log(`Push notification sent to ${to}`);
            } catch (err) {
              console.error(`Failed to send push notification to ${to}:`, err);
            }
          }
        }
        socket.emit("private-message", messageData); // Echo back to sender
      });

      // Handle message history retrieval
      socket.on("get-message-history", async (data, callback) => {
        if (!user.userId) {
          socket.emit("error", { message: "User not authenticated" });
          return;
        }
        // TODO: add pagination, rate limiting!

        const { page = 1, limit = 20 } = data; // Default to page 1, 20 messages per page
        if (typeof page !== "number" || page < 1 || !Number.isInteger(page)) {
          socket.emit("error", { message: "Invalid page number" });
          return;
        }
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
          callback({ messages });

          socket.emit("message-history", messages);
        } catch (error) {
          console.error("Error fetching messages:", error);
          socket.emit("error", { message: "Failed to fetch messages" });
          callback({ error: "Failed to fetch messages" });
        }
      });

      // socket.on("message-to-admin", async (data) => {
      //   const { message, timestamp } = data;
      //   const fromUser = socket.data.user.userId;

      //   // Save message for each admin
      //   const admins = Array.from(userSockets.values()).filter(
      //     (u) => u.role === "admin"
      //   );
      //   for (const admin of admins) {
      //     const newMessage = new Message({
      //       from: fromUser,
      //       to: admin.userId,
      //       message,
      //       timestamp,
      //       // TODO: do we need to store ip address?
      //     });
      //     await newMessage.save();
      //   }

      //   // Forward to admin room
      //   io.to("admin-room").emit("private-message", {
      //     from: fromUser,
      //     fromName: socket.data.user.name,
      //     message,
      //     timestamp,
      //   });
      // });

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

      // Handle get-online-users request (for admins)
      // socket.on("get-online-users", () => {
      //   if (user.role === "admin") {
      //     const onlineUsers = Array.from(userSockets.values());
      //     socket.emit("online-users", { users: onlineUsers });
      //   }
      // });
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
            engine.onWebSocket(
              peer._internal.nodeReq,
              peer._internal.nodeReq.socket,
              peer.websocket
            );
          },
        },
      })
    );
  } else {
    console.log("⚠️ Skipping Socket io connection during build phase");
  }
});
