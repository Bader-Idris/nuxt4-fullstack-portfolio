-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';

-- AlterTable
ALTER TABLE "posts" ADD COLUMN "slug" TEXT;
UPDATE "posts" SET "slug" = 'migrated-' || id::text WHERE "slug" IS NULL;
ALTER TABLE "posts" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");
