import Redis from "ioredis";

const config = useRuntimeConfig();
// Create and export a single Redis client instance
const redisUrl = config.redisUrl || "redis://localhost:6379";
let redisClient: Redis | null = null;

if (
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "production"
) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      connectTimeout: 10000,
    });

    // Verify connection
    redisClient
      .ping()
      .then(() => {
        console.log("✅ Connected to Redis");
      })
      .catch((error) => {
        console.error("❌ Failed to ping Redis:", error);
        redisClient = null;
      });

    // Handle runtime errors
    redisClient.on("error", (error) => {
      console.error("❌ Redis connection error:", error);
    });

    redisClient.on("reconnecting", () => {
      console.log("🔄 Reconnecting to Redis...");
    });

    redisClient.on("ready", () => {
      console.log("✅ Redis client ready");
    });
  } catch (error) {
    console.error("❌ Failed to initialize Redis:", error);
    redisClient = null;
  }
} else {
  console.log("⚠️ Skipping Redis connection during build phase");
}

export default defineNitroPlugin(async (nitroApp) => {
  // Skip Redis initialization during prerendering
  if (import.meta.prerender) {
    console.log("⚠️ Skipping Redis plugin during prerendering");
    return;
  }

  if (!redisClient) {
    console.error("❌ Redis client not available for Nitro plugin");
    return;
  }

  // Inject Redis client into Nitro app and H3 event context
  nitroApp.redis = redisClient;
  nitroApp.h3App?.stack?.push({
    route: "/",
    handle: (event) => {
      event.context.redis = redisClient;
    },
  });
});

export { redisClient };