import { redisClient } from "../plugins/redis";
import {
  ONLINE_USERS_KEY,
  UNIQUE_ONLINE_USERS_KEY,
  USER_CONN_COUNT_KEY,
} from "./constants";

// Helper functions for Redis-based online users management
export const getOnlineUsersFromRedis = async () => {
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

export const isUserOnline = async (userId: string) => {
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
export const addOnlineUserToRedis = async (
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
    await redisClient!.hset(UNIQUE_ONLINE_USERS_KEY, user.userId, userDataStr);
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
export const removeOnlineUserFromRedis = async (
  userId: string,
  socketId: string,
) => {
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