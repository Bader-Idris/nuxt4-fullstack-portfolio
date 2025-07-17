import type {} from /* types from models */ "./models.d.js";
import type {} from "./auth.d.js";
import type { Redis } from "ioredis";

declare module "nitropack" {
  interface NitroApp {
    mongo: {
      // todo: We should be able to use wildcard
      Order: typeof import("../models/mongo/Order").Order;
      Product: typeof import("../models/mongo/Product").Product;
      ReceivedEmail: typeof import("../models/mongo/ReceivedEmail").ReceivedEmail;
      Review: typeof import("../models/mongo/Review").Review;
      Token: typeof import("../models/mongo/Token").Token;
      User: typeof import("../models/mongo/User").User;
    };
    mailer: import("nodemailer").Transporter;
    auth: IAuth;
    redis?: Redis;
  }
  interface H3EventContext {
    redis?: Redis;
    // or
    // nitro: {
    //   redis?: Redis;
    // };
  }
}
