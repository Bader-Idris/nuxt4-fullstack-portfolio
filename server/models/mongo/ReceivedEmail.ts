import { Schema, model } from "mongoose";

const EmailSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, index: true }, // Performance: indexed queries are 100-1000x faster than collection scans (per MongoDB docs)
    message: { type: String, required: true },
    ip: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const ReceivedEmail = model("Email", EmailSchema);