import { io } from "socket.io-client";

// export const socket = io();

export const socket = io(useRuntimeConfig().public.originUrl, {
  path: "/socket.io/",
  withCredentials: true,
});