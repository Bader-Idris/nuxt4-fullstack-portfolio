import mongoose from 'mongoose'

export default defineNitroPlugin(async () => {
  // ? Used To Skip DB Connecting While Building
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
    const MONGO_URI = process.env.MONGO_URI;

    mongoose.set('strictQuery', false)

    let connected = false
    let attempts = 0
    const maxAttempts = 10 // Adjust as needed

    while (!connected && attempts < maxAttempts) {
      try {
        await mongoose.connect(MONGO_URI as string)

        /*
          TODO: for prod use

        await mongoose.connect(MONGO_URI, {
          maxPoolSize: 10, // Adjust based on your needs
          serverSelection
        */
        connected = true
        console.log('✅ Successfully connected to MongoDB')
      }
      catch (error) {
        attempts++
        console.error(`❌ MongoDB connection attempt ${attempts} failed:`)

        if (attempts >= maxAttempts) {
          console.error(
            '🔥 All MongoDB connection attempts failed - exiting process',
          )
          process.exit(1)
        }

        console.log(`⏳ Retrying connection in 5 seconds...`)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }

    // Graceful shutdown
    // nitroApp.hooks.hook("close", async () => {
    //   await mongoose.disconnect();
    //   console.log("✅ MongoDB connection closed");
    // });
  } else {
    console.log('⚠️ Skipping MongoDB connection during build phase');
  }
});
