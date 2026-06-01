-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mongodbId" TEXT;
UPDATE "users" SET "mongodbId" = 'migrated-' || id::text WHERE "mongodbId" IS NULL;
ALTER TABLE "users" ALTER COLUMN "mongodbId" SET NOT NULL;
CREATE UNIQUE INDEX "users_mongodbId_key" ON "users"("mongodbId");

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "summary" TEXT;

-- CreateTable
CREATE TABLE "comments" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "postId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "parentId" INTEGER,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
