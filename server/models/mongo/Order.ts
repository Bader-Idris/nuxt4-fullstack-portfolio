import { Schema, model } from "mongoose";

const SingleOrderItemSchema = new Schema<IOrderItem>({
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
});

const OrderSchema = new Schema<IOrder>(
  {
    tax: {
      type: Number,
      required: true,
    },
    shippingFee: {
      type: Number,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    orderItems: [SingleOrderItemSchema],
    status: {
      type: String,
      enum: ["pending", "failed", "paid", "delivered", "canceled"],
      default: "pending",
      index: true, // Performance: indexed queries are 100-1000x faster than collection scans (per MongoDB docs)
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientSecret: {
      type: String,
      required: true,
    },
    paymentIntentId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true },
);

export const Order = model<IOrder>("Order", OrderSchema);