-- CreateEnum
CREATE TYPE "SupplierPurchaseStatus" AS ENUM ('DRAFT', 'PAYMENT_REQUESTED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "supplierPurchaseId" TEXT;

-- CreateTable
CREATE TABLE "SupplierPurchase" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "incomingInvoiceNumber" TEXT,
    "incomingInvoiceAmount" DECIMAL(14,2),
    "comment" TEXT,
    "requestedAmount" DECIMAL(14,2),
    "status" "SupplierPurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentOrderStamped" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierPurchase_dealId_status_idx" ON "SupplierPurchase"("dealId", "status");

-- CreateIndex
CREATE INDEX "SupplierPurchase_supplierName_idx" ON "SupplierPurchase"("supplierName");

-- CreateIndex
CREATE INDEX "SupplierPayment_purchaseId_paidAt_idx" ON "SupplierPayment"("purchaseId", "paidAt");

-- CreateIndex
CREATE INDEX "Task_supplierPurchaseId_status_idx" ON "Task"("supplierPurchaseId", "status");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_supplierPurchaseId_fkey" FOREIGN KEY ("supplierPurchaseId") REFERENCES "SupplierPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchase" ADD CONSTRAINT "SupplierPurchase_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "SupplierPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
