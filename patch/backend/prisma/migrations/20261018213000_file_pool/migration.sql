-- Additive migration: existing files, invoices, tasks and links are preserved.
ALTER TABLE "StoredFile"
  ADD COLUMN "sha256" TEXT,
  ADD COLUMN "poolSource" TEXT NOT NULL DEFAULT 'APP',
  ADD COLUMN "uploadedById" TEXT;
CREATE INDEX "StoredFile_sha256_idx" ON "StoredFile"("sha256");
CREATE INDEX "StoredFile_uploadedById_idx" ON "StoredFile"("uploadedById");
CREATE TABLE "FilePoolLink" (
  "id" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "dealId" TEXT,
  "taskId" TEXT,
  "linkedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FilePoolLink_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FilePoolLink_fileId_idx" ON "FilePoolLink"("fileId");
CREATE INDEX "FilePoolLink_dealId_idx" ON "FilePoolLink"("dealId");
CREATE INDEX "FilePoolLink_taskId_idx" ON "FilePoolLink"("taskId");
ALTER TABLE "FilePoolLink" ADD CONSTRAINT "FilePoolLink_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FilePoolLink" ADD CONSTRAINT "FilePoolLink_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FilePoolLink" ADD CONSTRAINT "FilePoolLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
