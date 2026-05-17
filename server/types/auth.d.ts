import type { Document, Types } from "mongoose";

declare global {
  // Authentication types
  interface IAuth {
    TokenUser: {
      name: string;
      userId: string;
      role: string;
    };
    TokenPayload: {
      user: TokenUser;
      refreshToken?: string;
    };
  }
}