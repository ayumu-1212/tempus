-- CreateTable: users (first, before we reference it)
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- Create default user for existing records (bcrypt hash of 'xxx')
INSERT INTO "users" ("username", "password_hash", "display_name", "updated_at")
VALUES ('chanabe', '0ff91037cbff71ab07f91a8432aba6eb8d717f258c38c11bf57cf929c13c4907c30b508149fcb753a2', 'chanabe', CURRENT_TIMESTAMP);

-- AlterTable: Add user_id column as nullable first
ALTER TABLE "records" ADD COLUMN "user_id" INTEGER;

-- Update existing records to reference default user
UPDATE "records" SET "user_id" = (SELECT "id" FROM "users" WHERE "username" = 'default');

-- Now make user_id NOT NULL
ALTER TABLE "records" ALTER COLUMN "user_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "records_user_id_idx" ON "records"("user_id");

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: sessions
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
