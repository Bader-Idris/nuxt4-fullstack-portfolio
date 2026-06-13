import { redisClient } from "../plugins/redis";
import crypto from "node:crypto";
import {
  ONLINE_USERS_KEY,
  UNIQUE_ONLINE_USERS_KEY,
  USER_CONN_COUNT_KEY,
  WEBRTC_OFFERS_KEY,
} from "./constants";

// --- WebRTC Signaling Helpers ---

export const saveOfferToRedis = async (offerData: any) => {
  try {
    const offerId = `offer-${offerData.offererUserId}-${Date.now()}`;
    const data = {
      ...offerData,
      offerId,
      offerIceCandidates: [],
      answerIceCandidates: [],
      createdAt: Date.now(),
    };
    await redisClient!.hset(WEBRTC_OFFERS_KEY, offerId, JSON.stringify(data));
    return offerId;
  } catch (error) {
    console.error("Error saving WebRTC offer to Redis:", error);
    return null;
  }
};

export const getOfferFromRedis = async (offerId: string) => {
  try {
    const data = await redisClient!.hget(WEBRTC_OFFERS_KEY, offerId);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error fetching WebRTC offer from Redis:", error);
    return null;
  }
};

export const updateOfferInRedis = async (offerId: string, update: any) => {
  try {
    const current = await getOfferFromRedis(offerId);
    if (!current) return false;

    const updated = { ...current, ...update };
    await redisClient!.hset(WEBRTC_OFFERS_KEY, offerId, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error("Error updating WebRTC offer in Redis:", error);
    return false;
  }
};

export const addIceCandidateToRedis = async (
  offerId: string,
  candidate: any,
  isOfferer: boolean,
) => {
  try {
    const current = await getOfferFromRedis(offerId);
    if (!current) return false;

    if (isOfferer) {
      current.offerIceCandidates.push(candidate);
    } else {
      current.answerIceCandidates.push(candidate);
    }

    await redisClient!.hset(WEBRTC_OFFERS_KEY, offerId, JSON.stringify(current));
    return true;
  } catch (error) {
    console.error("Error adding ICE candidate to Redis:", error);
    return false;
  }
};

export const deleteOfferFromRedis = async (offerId: string) => {
  try {
    await redisClient!.hdel(WEBRTC_OFFERS_KEY, offerId);
    return true;
  } catch (error) {
    console.error("Error deleting WebRTC offer from Redis:", error);
    return false;
  }
};

export const findOfferByUsers = async (offererId: string, answererId: string) => {
  try {
    const allOffers = await redisClient!.hgetall(WEBRTC_OFFERS_KEY);
    for (const offerId in allOffers) {
      const offer = JSON.parse(allOffers[offerId]);
      if (offer.offererUserId === offererId && offer.answererUserId === answererId) {
        return offer;
      }
    }
    return null;
  } catch (error) {
    console.error("Error finding WebRTC offer by users:", error);
    return null;
  }
};

// --- Online Users Management ---
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
    const avatarHash = user.email
      ? crypto.createHash("sha256").update(user.email.toLowerCase().trim()).digest("hex")
      : undefined;

    const userData = {
      socketId: socketId,
      deviceId: deviceId, // From Nginx io cookie for professional sticky session tracking
      name: user.name,
      role: user.role,
      userId: user.userId,
      avatar: user.avatar,
      avatarHash,
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