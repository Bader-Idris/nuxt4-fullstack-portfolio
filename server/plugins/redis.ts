import Redis, { type Cluster } from "ioredis";

const config = useRuntimeConfig();
// Create and export a single Redis client instance
const redisUrl = config.redisUrl || "redis://localhost:6379";
const isCluster = config.redisCluster === "true" || !!config.redisClusterNodes;

let redisClient: Redis | Cluster | null = null;

if (
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "production"
) {
  try {
    if (isCluster) {
      console.log("🚀 Initializing Redis Cluster...");
      const nodes = config.redisClusterNodes 
        ? JSON.parse(config.redisClusterNodes) 
        : [{ host: "localhost", port: 6379 }];
      
      redisClient = new Redis.Cluster(nodes, {
        redisOptions: {
          maxRetriesPerRequest: 3,
          connectTimeout: 10000,
          retryStrategy(times) {
            return Math.min(times * 50, 2000);
          },
        },
        clusterRetryStrategy(times) {
          return Math.min(times * 50, 2000);
        },
      });
    } else {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          return Math.min(times * 50, 2000);
        },
        connectTimeout: 10000,
      });
    }

    // Verify connection
    redisClient
      .ping()
      .then(() => {
        console.log(`✅ Connected to Redis ${isCluster ? "Cluster" : "Single Instance"}`);
      })
      .catch((error) => {
        console.error("❌ Failed to ping Redis:", error);
        // Don't nullify if it's just a transient ping failure during startup
        // but we keep track of it
      });

    // Handle runtime errors
    redisClient.on("error", (error) => {
      console.error("❌ Redis connection error:", error);
    });

    redisClient.on("reconnecting", () => {
      console.log("🔄 Reconnecting to Redis...");
    });

    redisClient.on("ready", () => {
      console.log(`✅ Redis ${isCluster ? "Cluster" : "Client"} ready`);
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
  // @ts-ignore
  nitroApp.redis = redisClient;
  nitroApp.h3App?.stack?.push({
    route: "/",
    handle: (event) => {
      event.context.redis = redisClient;
    },
  });
});

export { redisClient };