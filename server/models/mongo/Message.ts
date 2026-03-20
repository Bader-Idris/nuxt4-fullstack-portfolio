import { Schema, model } from "mongoose";

const MessageSchema = new Schema({
  from: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true, // Performance: indexed queries are 100-1000x faster than collection scans (per MongoDB docs)
  },
  to: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false, // Optional for broadcast messages
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  isBroadcast: {
    type: Boolean,
    default: false,
    index: true,
  },
});

export const Message = model("Message", MessageSchema);
