import { Schema, model } from "mongoose";

const MessageSchema = new Schema({
  from: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  to: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false, // Optional for broadcast messages
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isBroadcast: {
    type: Boolean,
    default: false,
  },
});

export const Message = model("Message", MessageSchema);
