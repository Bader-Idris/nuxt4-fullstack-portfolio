import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@server/prisma/generated/prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

let prisma: PrismaClient | undefined;
let pool: Pool | undefined;

if (
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "production"
) {
  if (process.env.PSQL_URL) {
    try {
      // Use existing pool in dev to prevent leaks on HMR
      if (process.env.NODE_ENV === "development" && global.pgPool) {
        pool = global.pgPool;
      } else {
        pool = new Pool({
          connectionString: process.env.PSQL_URL,
          connectionTimeoutMillis: 10000, // Increased to 10s for stability
          idleTimeoutMillis: 30000,
          max: process.env.NODE_ENV === "development" ? 5 : 20, // Lower in dev to save connections
        });

        if (process.env.NODE_ENV === "development") {
          global.pgPool = pool;
        }
      }

      // Basic connectivity check to catch SSL/Auth errors early
      pool.on("error", (err) => {
        // "Connection terminated unexpectedly" is often transient or due to DB restart
        console.error("❌ Unexpected error on idle client", err.message);
      });

      if (process.env.NODE_ENV === "development") {
        const sanitizedUrl = process.env.PSQL_URL.replace(/:[^:]+@/, ":****@");
        console.log(`🔌 Attempting to connect to PostgreSQL at: ${sanitizedUrl}`);
        
        if (!global.prisma) {
          const adapter = new PrismaPg(pool);
          global.prisma = new PrismaClient({ 
            adapter,
            log: ['warn', 'error'],
          });
          
          // Immediate connectivity test
          global.prisma.$queryRaw`SELECT 1`
            .then(() => console.log("🚀 Initial Prisma connectivity test: SUCCESS"))
            .catch((err) => console.error("🛑 Initial Prisma connectivity test: FAILED", err.message));
            
          console.log("🆕 New Prisma client initialized (Dev Singleton).");
        } else {
          console.log("♻️ Reusing existing Prisma client (Dev Singleton).");
        }
        prisma = global.prisma;
      } else {
        const adapter = new PrismaPg(pool);
        prisma = new PrismaClient({ adapter });
        console.log("✅ Prisma client initialized (Production).");
      }
    } catch (e) {
      console.error("❌ Failed to initialize Prisma Client:", e.message);
    }
  } else {
    console.log(
      "⚠️ Skipping Prisma client initialization (no PSQL_URL provided)",
    );
  }
} else {
  console.log("⚠️ Skipping Prisma connection during build phase");
}

export default defineNitroPlugin(async (nitroApp) => {
  if (prisma && pool) {
    // @ts-expect-error: custom property
    nitroApp.prisma = prisma;

    nitroApp.h3App?.stack.push({
      route: "/",
      handle: (event) => {
        event.context.prisma = prisma;
      },
    });

    console.log("✅ Prisma client injected into Nitro app context.");

    nitroApp.hooks.hook("close", async () => {
      await prisma.$disconnect();
      await pool?.end();
      console.log("🔌 Prisma client and PG pool closed on server shutdown");
    });
  }
});

export { prisma };