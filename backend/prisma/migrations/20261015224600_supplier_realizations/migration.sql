ALTER TABLE "SupplierPurchase" ADD COLUMN "noRealizations" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "SupplierRealization" (
 "id" TEXT NOT NULL,
 "purchaseId" TEXT NOT NULL,
 "number" TEXT NOT NULL DEFAULT '',
 "createdById" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SupplierRealization_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupplierRealization_purchaseId_createdAt_idx" ON "SupplierRealization"("purchaseId", "createdAt");
ALTER TABLE "SupplierRealization" ADD CONSTRAINT "SupplierRealization_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "SupplierPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
