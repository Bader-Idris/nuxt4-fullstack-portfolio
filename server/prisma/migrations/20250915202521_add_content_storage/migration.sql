-- CreateTable
CREATE TABLE "public"."contents" (
    "path" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("path")
);

-- CreateTable
CREATE TABLE "public"."storages" (
    "key" TEXT NOT NULL,
    "value" JSONB,

    CONSTRAINT "storages_pkey" PRIMARY KEY ("key")
);
