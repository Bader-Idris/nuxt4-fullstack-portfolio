import redisDriver from "unstorage/drivers/redis";
import { Redis } from "ioredis";

// Create a single Redis client instance
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
export const redisClient = new Redis(redisUrl);

export default defineNitroPlugin(async (nitroApp) => {
  if ( process.env.NODE_ENV === "development" || process.env.NODE_ENV === "production" ) {
    // docs https://unstorage.unjs.io/drivers/redis
    const storage = useStorage();
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    // Connect to Redis
    try {
      // await redisClient; // ai says: // No need to await redisClient here, it's already a client instance
      console.log("✅ Connected to Redis");
    } catch (error) {
      console.error("❌ Failed to connect to Redis:", error);
      return; // Prevent Socket.IO from starting if Redis fails
    }

    // Mount redis driver
    storage.mount(
      "redis",
      redisDriver({
        url: redisUrl,
        // if you wanna use clustering, check the docs :4
      })
    );

    // Make redis client available globally
    nitroApp.redis = redisClient;
  } else {
    console.log("⚠️ Skipping redis connection during build phase");
  }
});
