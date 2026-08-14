# Production Database Fix Guide

This guide provides the steps to resolve database schema issues (like missing columns or tables) by applying Prisma migrations or pushing schema updates to your PostgreSQL database using `pnpm` / `npx`.

## Common Errors

- `relation "public.users" does not exist`: Tables are not created yet.
- `column "role" of relation "users" does not exist`: Schema is drifted; migrations are missing columns.
- `The column "status" of relation "posts" does not exist in the current database`: Soft-delete status column missing in PostgreSQL.
- `P1001: Can't reach database server`: Prisma CLI on the host cannot reach the internal Docker database IP.

## Resolution Steps

### 1. Development & Local Schema Sync (Recommended)

When working locally or updating schema columns (e.g. adding `status` to `posts`), run the package scripts using `pnpm` (or `bun`):

```bash
# Push schema changes directly to PostgreSQL
pnpm prisma:push

# Regenerate local Prisma Client (7.9.1+)
pnpm prisma:generate
```

### 2. Robust Migration in Docker (Production)

Run this command from your project root on the **production server**. It starts a temporary container on the same network as your database, mounts your local migrations and config, and runs the Prisma deploy command.

```bash
docker run --rm \
  --network portfolio_app-network \
  -v $(pwd)/server/prisma:/app/server/prisma \
  -v $(pwd)/prisma.config.ts:/app/prisma.config.ts \
  -v $(pwd)/package.json:/app/package.json \
  -v $(pwd)/pnpm-lock.yaml:/app/pnpm-lock.yaml \
  -v $(pwd)/.env:/app/.env \
  -w /app \
  node:24-alpine \
  sh -c "npx prisma migrate deploy --schema=./server/prisma/schema.prisma && npx prisma generate --schema=./server/prisma/schema.prisma"
```

_Note: Replace `portfolio_app-network` with your actual network name if different (check `docker network ls`)._

### 3. Manual SQL Apply (Emergency Fallback)

If the above fails, you can manually pipe the migrations or direct column updates into the `psql` container.

**Warning:** This bypasses Prisma's migration tracking (`_prisma_migrations` table) and will show errors for tables/columns that already exist. It is best used for initial setup or emergency fixes.

```bash
# Apply all migrations (will skip existing ones with errors)
find server/prisma/migrations -name "migration.sql" | sort | xargs cat | docker exec -i psql psql -U postgres -d articles

# Quick fix if status column is missing on posts table:
docker exec -i psql psql -U postgres -d articles -c "ALTER TABLE posts ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'published';"
```

### 4. Seed Database (Optional)

To populate the database with initial data (like the Admin user):

```bash
pnpm run seed:blog # or via docker execution
```

### 5. Verify Tables & Columns

Confirm that the tables and columns now exist:

```bash
docker exec -it psql psql -U postgres -d articles -c "\dt"
docker exec -it psql psql -U postgres -d articles -c "\d posts"
```

_Expected output: `posts` table should have `status`, `published`, `slug`, `title`, etc._

### 6. Restart Application

Restart your app containers to ensure they connect to the updated schema:

```bash
docker compose -f a.prod-certbot.yml restart app
```

## Troubleshooting Connectivity

If `P1001` persists even inside Docker, ensure your `PSQL_URL` in `.env` uses the service name `psql` instead of a hardcoded IP:
`PSQL_URL=postgresql://postgres:example@psql:5432/articles`