import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { defineEventHandler } from "h3";
import { redisClient } from "./redis";
// with multi replicas
import { createAdapter } from "@socket.io/redis-streams-adapter"; // official says: better than @socket.io/redis-adapter

import createWebPushInstance from "../utils/webPush";
import { initSocketHandlers } from "../sockets";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "../sockets/types";

// let Engine: any; // if we want to use dynamic import below, as it differs in bun, but not functional yet with bun 1.3.6

export default defineNitroPlugin(async (nitroApp: NitroApp) => {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "production"
  ) {
    // Rate limiters and other logic are now managed in @server/sockets/

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
    const io = new Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >({
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

    // Initialize all socket logic (Auth, Handlers, etc.)
    initSocketHandlers(io, webpush);

    nitroApp.router.use(
      "/socket.io/",
      defineEventHandler({
        handler(event) {
          engine.handleRequest(event.node.req, event.node.res);
          event._handled = true;
        },
        websocket: {
          open(peer) {
            const nodeReq = (peer as any)._internal?.nodeReq;
            if (nodeReq) {
              // @ts-expect-error private method and property
              engine.prepare(nodeReq);
              // @ts-expect-error private method and property
              engine.onWebSocket(
                nodeReq,
                nodeReq.socket,
                (peer as any).websocket,
              );
            }
          },
        },
      }),
    );
  } else {
    console.log("⚠️ Skipping Socket io connection during build phase");
  }
});