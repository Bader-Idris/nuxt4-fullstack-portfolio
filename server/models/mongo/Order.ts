import { Schema, model } from 'mongoose'
import type { IOrder, IOrderItem } from './types'

const SingleOrderItemSchema = new Schema<IOrderItem>({
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
})

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
      enum: ['pending', 'failed', 'paid', 'delivered', 'canceled'],
      default: 'pending',
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clientSecret: {
      type: String,
      required: true,
    },
    paymentIntentId: {
      type: String,
    },
  },
  { timestamps: true },
)

export const Order = model<IOrder>('Order', OrderSchema)
