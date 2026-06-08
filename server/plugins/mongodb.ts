import mongoose from "mongoose";

export default defineNitroPlugin(async () => {
  // ? Used To Skip DB Connecting While Building
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "production"
  ) {
    const MONGO_URI = process.env.MONGO_URI;

    mongoose.set("strictQuery", false);

    let connected = false;
    let attempts = 0;
    const maxAttempts = 10; // Adjust as needed

    while (!connected && attempts < maxAttempts) {
      try {
        await mongoose.connect(MONGO_URI as string, {
          maxPoolSize: process.env.NODE_ENV === "production" ? 50 : 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          family: 4, // Use IPv4, skip trying IPv6
        });

        connected = true;
        console.log("✅ Successfully connected to MongoDB");
      } catch (error) {
        attempts++;
        console.error(`❌ MongoDB connection attempt ${attempts} failed:`, error);

        if (attempts >= maxAttempts) {
          console.error(
            "🔥 All MongoDB connection attempts failed - exiting process",
          );
          process.exit(1);
        }

        const delay = Math.min(attempts * 1000, 10000);
        console.log(`⏳ Retrying connection in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Graceful shutdown
    // nitroApp.hooks.hook("close", async () => {
    //   await mongoose.disconnect();
    //   console.log("✅ MongoDB connection closed");
    // });
  } else {
    console.log("⚠️ Skipping MongoDB connection during build phase");
  }
});