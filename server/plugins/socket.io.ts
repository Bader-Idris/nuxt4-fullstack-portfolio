import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { defineEventHandler } from "h3";
import { isTokenValid } from "../utils/jwt";
import { Message, Token } from "../models/mongo";
import { getContacts } from "../utils/getContacts";
// docs: https://github.com/animir/node-rate-limiter-flexible/wiki/Overall-example#websocket-single-connection-prevent-flooding
import { RateLimiterRedis } from "rate-limiter-flexible";
import { redisClient } from "./redis";
// with multi replicas
import { createAdapter } from "@socket.io/redis-streams-adapter"; // official says: better than @socket.io/redis-adapter

import createWebPushInstance from "../utils/webPush";
import { getSubscription, getCapacitorSubscription } from "../utils/redisUtils";
import { sendAPN, sendFCM } from "../utils/push";
// for future organizing
// import * from '.././sockets'

// let Engine: any; // if we want to use dynamic import below, as it differs in bun, but not functional yet with bun 1.3.6

export default defineNitroPlugin(async (nitroApp: NitroApp) => {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "production"
  ) {
    // --- START: Production-Ready Rate Limiters ---
    const maxPointsPerSecond = 5; // General limit per IP per second
    const maxPointsPerMinute = 50; // Stricter limit for expensive actions

    // 1. Connection Rate Limiter (per IP)
    // Limits how many times a single IP can attempt to connect per second.
    // This is your first defense against connection floods.
    const _connectionLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "limit_conn_ip",
      points: maxPointsPerSecond,
      duration: 1, // Per 1 second
      blockDuration: 60 * 10, // Block for 10 minutes if consumed more than points
    });

    // 2. High-Cost Action Limiter (per User ID)
    // Stricter limit for resource-intensive events like creating or starting a game.
    // We use the User ID to prevent one user from spamming these actions.
    const _gameActionLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "limit_game_action_user",
      points: 5, // Only 5 expensive actions...
      duration: 60, // ...per minute
    });

    // 3. General Event Limiter (per User ID)
    // A more lenient limiter for frequent events like chat messages or hitting the buzzer.
    const _generalEventLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "limit_event_user",
      points: maxPointsPerMinute,
      duration: 60, // Per 1 minute
    });
    // --- END: Production-Ready Rate Limiters ---

    // Dynamically import the correct Engine.io server based on environment
    // if (process.env.NITRO_PRESET === "bun" || typeof Bun !== "undefined") {
    //   // Dynamically load the Bun-optimized engine
    //   const mod = await import("@socket.io/bun-engine");
    //   Engine = mod.Server;
    // } else {
    //   // Fallback to standard Node.js engine
    //   const mod = await import("engine.io");
    //   Engine = mod.Server;
    // }

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

    // Socket.IO authentication middleware
    io.use(async (socket, next) => {
      try {
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) {
          return next(new Error("Authentication error"));
        }

        // Robust cookie parsing
        const parsedCookies = Object.fromEntries(
          cookieHeader.split(";").map((c) => {
            const [key, ...v] = c.trim().split("=");
            return [key, v.join("=")];
          }),
        );

        const accessToken = parsedCookies["accessToken"];
        const refreshTokenJWT = parsedCookies["refreshToken"];

        if (accessToken) {
          try {
            const payload = isTokenValid(accessToken);
            if (payload && payload.user) {
              socket.data.user = payload.user;
              return next();
            }
          } catch {
            // Access token invalid or expired, proceed to check refresh token
          }
        }

        if (refreshTokenJWT) {
          try {
            const payload = isTokenValid(refreshTokenJWT);
            if (payload && payload.user && payload.refreshToken) {
              const existingToken = await Token.findOne({
                user: payload.user.userId,
                refreshToken: payload.refreshToken,
              });

              if (existingToken && existingToken.isValid) {
                socket.data.user = payload.user;
                // We allow the connection; the user is authenticated via refresh token
                return next();
              }
            }
          } catch {
            // Refresh token invalid or expired
          }
        }

        return next(new Error("Authentication error"));
      } catch (error) {
        console.error("Socket authentication middleware error:", error);
        return next(new Error("Authentication error"));
      }
    });

    // Redis key for online users
    const ONLINE_USERS_KEY = "online_users"; // socketId -> userData
    const UNIQUE_ONLINE_USERS_KEY = "unique_online_users"; // userId -> userData (canonical)
    const USER_CONN_COUNT_KEY = "user_conn_count"; // userId -> count

    // Helper functions for Redis-based online users management
    const getOnlineUsersFromRedis = async () => {
      try {
        const data = await redisClient!.hgetall(UNIQUE_ONLINE_USERS_KEY);
        // We still return an array for the Socket.IO emit, but the logic is managed in Redis
        return Object.values(data)
          .map((userDataStr: string) => {
            try {
              return JSON.parse(userDataStr);
            } catch (e) {
              console.error(`Error parsing online user data:`, e);
              return null;
            }
          })
          .filter((u) => u !== null);
      } catch (error) {
        console.error("Error fetching online users from Redis:", error);
        return [];
      }
    };

    const isUserOnline = async (userId: string) => {
      try {
        const count = await redisClient!.hget(USER_CONN_COUNT_KEY, userId);
        return parseInt(count || "0") > 0;
      } catch (error) {
        console.error(`Error checking if user ${userId} is online:`, error);
        return false;
      }
    };

    // ADDED: socketId as field to allow multiple connections per user
    // Returns the new connection count for the user
    const addOnlineUserToRedis = async (
      user: any,
      socketId: string,
      deviceId?: string,
    ) => {
      try {
        const userData = {
          socketId: socketId,
          deviceId: deviceId, // From Nginx io cookie for professional sticky session tracking
          name: user.name,
          role: user.role,
          userId: user.userId,
          connectedAt: Date.now(),
        };
        const userDataStr = JSON.stringify(userData);

        // Use Redis to manage the state
        await redisClient!.hset(ONLINE_USERS_KEY, socketId, userDataStr);
        await redisClient!.hset(
          UNIQUE_ONLINE_USERS_KEY,
          user.userId,
          userDataStr,
        );
        const newCount = await redisClient!.hincrby(
          USER_CONN_COUNT_KEY,
          user.userId,
          1,
        );

        return newCount;
      } catch (error) {
        console.error("Error adding user to Redis:", error);
        return 0;
      }
    };

    // ADDED: removed based on socketId and userId
    // Returns true if this was the last connection for the user
    const removeOnlineUserFromRedis = async (userId: string, socketId: string) => {
      try {
        await redisClient!.hdel(ONLINE_USERS_KEY, socketId);
        const remainingCount = await redisClient!.hincrby(
          USER_CONN_COUNT_KEY,
          userId,
          -1,
        );

        // Safety check: ensure count doesn't go below 0
        if (remainingCount <= 0) {
          await redisClient!.hdel(UNIQUE_ONLINE_USERS_KEY, userId);
          await redisClient!.hdel(USER_CONN_COUNT_KEY, userId);
          return true; // Last connection removed
        }
        return false; // Still has other connections
      } catch (error) {
        console.error("Error removing user from Redis:", error);
        return false;
      }
    };

    io.on("connection", async (socket) => {
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

        // Add user to Redis and get the new connection count
        const newCount = await addOnlineUserToRedis(user, socket.id, deviceId);

        if (newCount === 1) {
          // Emit updated online users list ONLY if this was their first connection
          socket.broadcast.emit("user-joined", {
            userId: user.userId,
            socketId: socket.id,
            name: user.name,
            role: user.role,
          });
        }

        // Send socket ID and user info to the client
        socket.emit("connection-established", {
          socketId: socket.id,
          userId: user.userId,
          name: user.name,
          role: user.role,
        });

        // Send current online users list to the newly connected user
        const currentOnlineUsers = await getOnlineUsersFromRedis();
        const filteredOnlineUsers = currentOnlineUsers.filter(
          (u) => u.userId !== user.userId,
        ); // Exclude current user
        socket.emit("online-users", filteredOnlineUsers);

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

        socket.on("private-message", async (data) => {
          // TODO: we can implement profanity control to filter bad words
          const { to, message, timestamp } = data;
          const fromUser = socket.data.user;

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
              const subscription = await getSubscription(redisClient, to);
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
                redisClient,
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
                console.log(
                  `Capacitor push notification sent successfully to ${to}`,
                );
              } else {
                console.log(
                  `No Capacitor push subscription found for user ${to}`,
                );
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

        socket.on("get-contacts", async (data, callback) => {
          const user = socket.data.user;
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
      } catch (error) {
        console.error("Error in socket connection handler:", error);
        socket.disconnect();
      }
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
              peer.websocket,
            );
          },
        },
      }),
    );
  } else {
    console.log("⚠️ Skipping Socket io connection during build phase");
  }
});