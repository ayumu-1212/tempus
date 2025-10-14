-- CreateTable
CREATE TABLE "records" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "records_timestamp_idx" ON "records"("timestamp");
