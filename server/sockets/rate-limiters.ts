// docs: https://github.com/animir/node-rate-limiter-flexible/wiki/Overall-example#websocket-single-connection-prevent-flooding
import { RateLimiterRedis } from "rate-limiter-flexible";
import { redisClient } from "../plugins/redis";

// --- START: Production-Ready Rate Limiters ---
const maxPointsPerSecond = 5; // General limit per IP per second
const maxPointsPerMinute = 50; // Stricter limit for expensive actions

// 1. Connection Rate Limiter (per IP)
// Limits how many times a single IP can attempt to connect per second.
// This is your first defense against connection floods.
export const connectionLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "limit_conn_ip",
  points: maxPointsPerSecond,
  duration: 1, // Per 1 second
  blockDuration: 60 * 10, // Block for 10 minutes if consumed more than points
});

// 2. High-Cost Action Limiter (per User ID)
// Stricter limit for resource-intensive events like creating or starting a game.
// We use the User ID to prevent one user from spamming these actions.
export const gameActionLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "limit_game_action_user",
  points: 5, // Only 5 expensive actions...
  duration: 60, // ...per minute
});

// 3. General Event Limiter (per User ID)
// A more lenient limiter for frequent events like chat messages or hitting the buzzer.
export const generalEventLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "limit_event_user",
  points: maxPointsPerMinute,
  duration: 60, // Per 1 minute
});
// --- END: Production-Ready Rate Limiters ---