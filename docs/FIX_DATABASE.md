# Production Database Fix Guide

This guide provides the steps to resolve database schema issues (like missing columns or tables) by applying Prisma migrations to your production PostgreSQL database.

## Common Errors

- `relation "public.users" does not exist`: Tables are not created yet.
- `column "role" of relation "users" does not exist`: Schema is drifted; migrations are missing columns.
- `P1001: Can't reach database server`: Prisma CLI on the host cannot reach the internal Docker database IP.

## Resolution Steps

### 1. Robust Migration (Recommended)

Run this command from your project root on the **production server**. It starts a temporary container on the same network as your database, mounts your local migrations and config, and runs the Prisma deploy command.

```bash
docker run --rm \
  --network portfolio_app-network \
  -v $(pwd)/server/prisma:/app/server/prisma \
  -v $(pwd)/prisma.config.ts:/app/prisma.config.ts \
  -v $(pwd)/package.json:/app/package.json \
  -v $(pwd)/bun.lock:/app/bun.lock \
  -v $(pwd)/.env:/app/.env \
  -w /app \
  oven/bun:alpine \
  sh -c "bun install prisma --silent && bunx prisma migrate deploy"
```

_Note: Replace `portfolio_app-network` with your actual network name if different (check `docker network ls`)._

### 2. Manual SQL Apply (Fallback)

If the above fails or you don't have Bun/Prisma ready, you can manually pipe the migrations into the `psql` container. 

**Warning:** This bypasses Prisma's migration tracking (`_prisma_migrations` table) and will show errors for tables/columns that already exist. It is best used for initial setup or emergency fixes.

```bash
# Apply all migrations (will skip existing ones with errors)
find server/prisma/migrations -name "migration.sql" | sort | xargs cat | docker exec -i psql psql -U postgres -d articles
```

### 3. Seed Database (Optional)

To populate the database with initial data (like the Admin user):

```bash
docker run --rm \
  --network portfolio_app-network \
  -v $(pwd)/server/prisma:/app/server/prisma \
  -v $(pwd)/prisma.config.ts:/app/prisma.config.ts \
  -v $(pwd)/package.json:/app/package.json \
  -v $(pwd)/bun.lock:/app/bun.lock \
  -v $(pwd)/.env:/app/.env \
  -v $(pwd)/server/utils:/app/server/utils \
  -v $(pwd)/server/plugins:/app/server/plugins \
  -w /app \
  oven/bun:alpine \
  sh -c "bun install prisma tsx --silent && bunx prisma db seed"
```

### 4. Verify Tables

Confirm that the tables and columns now exist:

```bash
docker exec -it psql psql -U postgres -d articles -c "\dt"
docker exec -it psql psql -U postgres -d articles -c "\d users"
```

_Expected output: `users` table should now have the `role` column._

### 5. Restart Application

Restart your app containers to ensure they connect to the updated schema:

```bash
docker compose -f a.prod-certbot.yml restart app
```

## Troubleshooting Connectivity

If `P1001` persists even inside Docker, ensure your `PSQL_URL` in `.env` uses the service name `psql` instead of a hardcoded IP:
`PSQL_URL=postgresql://postgres:example@psql:5432/articles`