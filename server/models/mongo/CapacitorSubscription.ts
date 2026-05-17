import { Schema, model, type Document } from "mongoose";

export interface ICapacitorSubscription extends Document {
  user: Schema.Types.ObjectId;
  token: string;
  platform: string;
}

const CapacitorSubscriptionSchema = new Schema<ICapacitorSubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Performance: indexed queries are 100-1000x faster than collection scans (per MongoDB docs)
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    platform: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export const CapacitorSubscription = model<ICapacitorSubscription>(
  "CapacitorSubscription",
  CapacitorSubscriptionSchema,
);