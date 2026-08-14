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

export function getPrismaClient(): PrismaClient | null {
  if (global.prisma) {
    prisma = global.prisma;
    pool = global.pgPool;
    return global.prisma;
  }

  const psqlUrl = process.env.PSQL_URL || process.env.DATABASE_URL;
  if (!psqlUrl) {
    return null;
  }

  try {
    if (!global.pgPool) {
      global.pgPool = new Pool({
        connectionString: psqlUrl,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: process.env.NODE_ENV === "development" ? 5 : 20,
      });

      global.pgPool.on("error", (err) => {
        console.error("❌ Unexpected error on idle PG client:", err.message);
      });
    }

    const adapter = new PrismaPg(global.pgPool);
    const client = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });

    if (process.env.NODE_ENV === "development") {
      const sanitizedUrl = psqlUrl.replace(/:[^:]+@/, ":****@");
      console.log(`🔌 Attempting to connect to PostgreSQL at: ${sanitizedUrl}`);
      client.$queryRaw`SELECT 1`
        .then(() => console.log("🚀 Initial Prisma connectivity test: SUCCESS"))
        .catch((err) => console.error("🛑 Initial Prisma connectivity test: FAILED", err.message));
    }

    global.prisma = client;
    prisma = client;
    pool = global.pgPool;
    return client;
  } catch (e: any) {
    console.error("❌ Failed to initialize Prisma Client:", e?.message || e);
    return null;
  }
}

// Attempt initial setup during module evaluation if environment is ready
if (
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "production"
) {
  if (process.env.PSQL_URL || process.env.DATABASE_URL) {
    getPrismaClient();
  } else {
    console.log("⚠️ Skipping Prisma client initialization (no PSQL_URL / DATABASE_URL provided)");
  }
} else {
  console.log("⚠️ Skipping Prisma connection during build phase");
}

export default defineNitroPlugin(async (nitroApp) => {
  const activePrisma = getPrismaClient();
  if (activePrisma && global.pgPool) {
    // @ts-expect-error: custom property
    nitroApp.prisma = activePrisma;

    nitroApp.hooks.hook("request", (event) => {
      event.context.prisma = activePrisma;
    });

    console.log("✅ Prisma client injected into Nitro app context.");

    nitroApp.hooks.hook("close", async () => {
      await activePrisma.$disconnect();
      await global.pgPool?.end();
      console.log("🔌 Prisma client and PG pool closed on server shutdown");
    });
  }
});

export { prisma, getPrismaClient as getPrisma };