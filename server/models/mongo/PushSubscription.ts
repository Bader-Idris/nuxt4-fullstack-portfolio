
import { Schema, model, type Document } from 'mongoose';

export interface IPushSubscription extends Document {
  user: Schema.Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
  },
  { timestamps: true },
);

export const PushSubscription = model<IPushSubscription>(
  'PushSubscription',
  PushSubscriptionSchema,
);
