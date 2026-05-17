# Production Database Fix Guide

This guide provides the steps to resolve the `relation "public.users" does not exist` error by applying Prisma migrations to your production PostgreSQL database.

## Why this is happening

The database is running inside a Docker network (`portfolio_app-network`), but the tables haven't been created yet. Running migrations from the host fails because the database port (5432) isn't exposed and the internal Docker IP is not reachable from the host's Prisma CLI.

## Resolution Steps

### 1. Apply Migrations (Dynamic PSQL Approach)

Run this command from your project root on the **production server**. It automatically finds all `migration.sql` files, sorts them by their timestamped folder names, and pipes them into the container:

```bash
find server/prisma/migrations -name "migration.sql" | sort | xargs cat | docker exec -i psql psql -U postgres -d articles
```

### 2. Verify Tables

Confirm that the tables now exist:

```bash
docker exec -it psql psql -U postgres -d articles -c "\dt"
```

_Expected output: A list containing `users`, `posts`, `contents`, and `storages`._

### 3. Note on Prisma Sync

Since this bypasses the `prisma migrate` command, Prisma might warn about drift later. To fully sync the migration history without using a Node image, you would need to manually insert records into the `_prisma_migrations` table, which is usually not necessary unless you plan to run more migrations later via Prisma CLI.

### 4. Restart Application

Restart your app containers to ensure they connect to the new tables:

```bash
docker compose -f a.prod-certbot.yml restart app
```

## Security Note

The `PSQL_URL` used above matches your `a.prod-certbot.yml` defaults. If you have changed your `POSTGRES_PASSWORD` or `POSTGRES_DB` in your `.env`, update the URL accordingly.