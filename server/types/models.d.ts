import type { Document, Types } from "mongoose";

declare global {
  // Token types
  interface IToken extends Document {
    refreshToken: string;
    ip: string;
    userAgent: string;
    isValid: boolean;
    user: Types.ObjectId;
  }

  // Review types
  interface IReview extends Document {
    rating: number;
    title: string;
    comment: string;
    user: Types.ObjectId;
    product: Types.ObjectId;
  }

  interface IUserSettings {
    openLastChat: boolean;
    showOldConversationTitles: boolean;
  }

  // User types
  interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: "admin" | "user" | "guest";
    provider: "email" | "google" | "facebook";
    verificationToken?: string;
    isVerified: boolean;
    verified?: Date;
    passwordToken?: string;
    passwordTokenExpirationDate?: Date;
    lastActiveChat?: string;
    isSubscribed: boolean;
    settings?: IUserSettings;
    comparePassword(candidatePassword: string): Promise<boolean>;
  }

  // Product types
  interface IProduct extends Document {
    name: string;
    price: number;
    description: string;
    image: string;
    category: "office" | "kitchen" | "bedroom";
    company: "ikea" | "liddy" | "marcos";
    colors: string[];
    featured: boolean;
    freeShipping: boolean;
    inventory: number;
    averageRating: number;
    numOfReviews: number;
    user: Types.ObjectId;
    reviews: Types.ObjectId[];
  }

  // Order types
  interface IOrderItem {
    name: string;
    image: string;
    price: number;
    amount: number;
    product: Types.ObjectId;
  }

  interface IOrder extends Document {
    tax: number;
    shippingFee: number;
    subtotal: number;
    total: number;
    orderItems: IOrderItem[];
    status: "pending" | "failed" | "paid" | "delivered" | "canceled";
    user: Types.ObjectId;
    clientSecret: string;
    paymentIntentId?: string;
  }

  // Authentication types
  interface TokenUser {
    name: string;
    userId: string;
    role: string;
  }

  interface TokenPayload {
    user: TokenUser;
    refreshToken?: string;
  }
}