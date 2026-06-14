import mongoose from "mongoose";
import crypto from "node:crypto";
import { Message } from "../models/mongo";
import { redisClient } from "../plugins/redis";
import { UNIQUE_ONLINE_USERS_KEY } from "../sockets/constants";

export async function getContacts(userId: string, page: number, limit: number) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  try {
    const contacts = await Message.aggregate([
      {
        $match: {
          $or: [{ from: userObjectId }, { to: userObjectId }],
          isBroadcast: false
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$from", userObjectId] },
              then: "$to",
              else: "$from",
            },
          },
          lastMessage: { $first: "$$ROOT" },
        },
      },
      {
        $sort: { "lastMessage.timestamp": -1 },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "contactInfo",
        },
      },
      {
        $unwind: "$contactInfo",
      },
      {
        $project: {
          _id: 0,
          userId: { $toString: "$contactInfo._id" },
          name: "$contactInfo.name",
          avatar: "$contactInfo.avatar",
          email: "$contactInfo.email",
          role: "$contactInfo.role",
          lastMessage: {
            id: { $toString: "$lastMessage._id" },
            message: "$lastMessage.message",
            timestamp: "$lastMessage.timestamp",
            from: { $toString: "$lastMessage.from" },
            to: { $toString: "$lastMessage.to" },
          },
        },
      },
    ]);

    return await Promise.all(contacts.map(async (contact) => {
      const avatarHash = contact.email
        ? crypto.createHash("sha256").update(contact.email.toLowerCase().trim()).digest("hex")
        : undefined;
      
      const onlineData = await redisClient!.hget(UNIQUE_ONLINE_USERS_KEY, contact.userId);
      
      const { email, ...rest } = contact;
      return { 
        ...rest, 
        avatarHash,
        isOnline: !!onlineData
      };
    }));
  } catch (error) {
    console.error("Error fetching contacts:", error);
    throw new Error("Failed to fetch contacts");
  }
}
