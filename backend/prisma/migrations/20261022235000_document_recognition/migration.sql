-- Non-destructive migration. Do not run prisma migrate reset.
CREATE TYPE "RecognitionStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');
CREATE TABLE "DocumentRecognition" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "RecognitionStatus" NOT NULL DEFAULT 'PENDING',
    "engineVersion" TEXT NOT NULL DEFAULT 'msm-recognition-1.0',
    "result" JSONB,
    "errorText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentRecognition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentRecognition_fileId_key" ON "DocumentRecognition"("fileId");
ALTER TABLE "DocumentRecognition" ADD CONSTRAINT "DocumentRecognition_fileId_fkey"
    FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
