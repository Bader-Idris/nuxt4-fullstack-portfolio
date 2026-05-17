import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import dotenv from "dotenv";
import path from "path";

// Load .env from root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function diag() {
  if (process.env.SKIP_PRISMA_CHECK === "true") {
    console.log("⏭️ Skipping Prisma check (SKIP_PRISMA_CHECK=true)");
    return;
  }

  console.log("🔍 Checking Prisma Integrity...");
  const url = process.env.PSQL_URL;
  console.log("PSQL_URL:", url ? url.replace(/:[^:]+@/, ":****@") : "MISSING");

  if (!url) {
    console.error("Error: PSQL_URL not found in environment.");
    return;
  }

  const pool = new Pool({
    connectionString: url,
  });

  console.log("1. Checking tables via direct pg query...");
  try {
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    const tables = res.rows.map((r) => r.table_name);
    console.log("Tables in public schema:", tables);

    if (!tables.includes("users")) {
      console.error("CRITICAL: 'users' table NOT found in public schema!");
    } else {
      console.log("SUCCESS: 'users' table exists.");
    }
  } catch (e) {
    console.error("Direct PG query failed:", e.message);
  }

  console.log("\n2. Checking Prisma connectivity...");
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const userCount = await prisma.user.count();
    console.log("Prisma user count success:", userCount);

    const firstUser = await prisma.user.findFirst();
    console.log("Prisma findFirst success:", firstUser);
  } catch (e) {
    console.error("Prisma query failed!");
    console.error("Message:", e.message);
    if (e.code) console.error("Code:", e.code);
    if (e.meta) console.error("Meta:", JSON.stringify(e.meta, null, 2));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

diag().catch(console.error);