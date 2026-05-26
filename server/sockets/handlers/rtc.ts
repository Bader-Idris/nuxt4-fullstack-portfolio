import { Server, Socket } from "socket.io";
import {
  isUserOnline,
  saveOfferToRedis,
  getOfferFromRedis,
  updateOfferInRedis,
  addIceCandidateToRedis,
  deleteOfferFromRedis,
  findOfferByUsers,
} from "../state";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "../types";
import { notifyMissedCall } from "../../utils/webrtc-notifications";

export const registerRTCHandlers = (
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
  const user = socket.data.user;

  socket.on("call-offer", async (data) => {
    const { to, offer, callType } = data;
    const isOnline = await isUserOnline(to);

    if (isOnline) {
      // Save offer to Redis
      await saveOfferToRedis({
        offererUserId: user.userId,
        offererSocketId: socket.id,
        answererUserId: to,
        offer,
        callType,
      });

      io.to(`user-${to}`).emit("call-offer", {
        from: user.userId,
        fromName: user.name,
        offer,
        callType,
      });
    } else {
      // User is offline, send notification
      await notifyMissedCall(to, user.name);
      socket.emit("error", { message: "User is offline. They have been notified." });
    }
  });

  socket.on("call-answer", async (data, callback) => {
    const { to, answer, callType } = data;
    const isOnline = await isUserOnline(to);

    if (isOnline) {
      // Find the offer in Redis
      const offer = await findOfferByUsers(to, user.userId);
      if (offer) {
        // Update offer with answer
        await updateOfferInRedis(offer.offerId, {
          answer,
          answererSocketId: socket.id,
        });

        // Send existing ICE candidates to the answerer
        if (typeof callback === "function") {
          callback(offer.offerIceCandidates || []);
        }

        io.to(`user-${to}`).emit("call-answer", {
          from: user.userId,
          answer,
          callType,
        });
      }
    }
  });

  socket.on("ice-candidate", async (data) => {
    const { to, candidate } = data;

    // Find active offer involving these users
    let offer = await findOfferByUsers(user.userId, to); // user is offerer
    let isOfferer = true;

    if (!offer) {
      offer = await findOfferByUsers(to, user.userId); // user is answerer
      isOfferer = false;
    }

    if (offer) {
      // Save ICE candidate to Redis
      await addIceCandidateToRedis(offer.offerId, candidate, isOfferer);

      const isOnline = await isUserOnline(to);
      if (isOnline) {
        io.to(`user-${to}`).emit("ice-candidate", {
          from: user.userId,
          candidate,
        });
      }
    }
  });

  socket.on("call-declined", async (data) => {
    const { to, reason } = data;

    // Clean up offer from Redis
    const offer = await findOfferByUsers(to, user.userId);
    if (offer) {
      await deleteOfferFromRedis(offer.offerId);
    }

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

    // Clean up offer from Redis
    let offer = await findOfferByUsers(user.userId, to);
    if (!offer) {
      offer = await findOfferByUsers(to, user.userId);
    }
    if (offer) {
      await deleteOfferFromRedis(offer.offerId);
    }

    const isOnline = await isUserOnline(to);
    if (isOnline) {
      io.to(`user-${to}`).emit("call-ended", {
        from: user.userId,
        fromName: user.name,
      });
    }
  });

  socket.on("call-fingerprint", async (data) => {
    const { to, duration, callType, status } = data;
    const id = `fp-${Date.now()}`;
    const timestamp = new Date();

    // Persist call fingerprint to MongoDB as a system message
    try {
      const { Message } = await import("../../models/mongo/Message");
      
      let statusText = "";
      if (status === "declined") statusText = "Call declined";
      else if (status === "busy") statusText = "User busy";
      else if (status === "missed") statusText = "Missed call";
      else statusText = `${callType === "video" ? "Video" : "Voice"} call ended`;

      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      const durationText = duration > 0 ? ` • ${mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}` : "";

      const fingerprintHtml = `<div class="system-message call-fingerprint">
        <span class="icon">${duration > 0 ? "📞" : "📵"}</span>
        <span>${statusText}${durationText}</span>
      </div>`;

      const newMessage = new Message({
        from: user.userId,
        to,
        message: fingerprintHtml,
        timestamp,
      });
      await newMessage.save();

      // Broadcast to both participants if online
      const fingerprintData = {
        from: user.userId,
        fromName: user.name,
        duration,
        callType,
        status,
        timestamp,
        id: newMessage._id.toString(),
        message: fingerprintHtml // Include HTML for immediate rendering
      };

      io.to(`user-${to}`).to(`user-${user.userId}`).emit("call-fingerprint", fingerprintData);
    } catch (error) {
      console.error("Error saving call fingerprint:", error);
    }
  });
};
