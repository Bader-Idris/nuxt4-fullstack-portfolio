import { defineConfig } from 'prisma/config'
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Set the absolute path for the generated client (Prisma v7 output override)
process.env.PRISMA_GEN_PATH = path.resolve(__dirname, "./server/prisma/generated/prisma")

export default defineConfig({
  schema: path.resolve(__dirname, "./server/prisma/schema.prisma"),
  migrations: {
    path: path.resolve(__dirname, "./server/prisma/migrations"),
    seed: "tsx ./server/prisma/seed.ts",
    // seed: "bun run ./server/prisma/seed.ts",
  },
  datasource: {
    // url: env("PSQL_URL"),
    // will not throw if DATABASE_URL is missing
    // Using process.env instead of env() to prevent throwing if PSQL_URL is missing during build
    url: process.env.PSQL_URL || 'postgresql://dummy:dummy@localhost:5432/dummy',
  },
});
