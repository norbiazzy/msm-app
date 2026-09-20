-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NO_PREPAYMENT', 'WAITING', 'ADVANCE', 'PAID', 'DEFERRED');

-- CreateEnum
CREATE TYPE "ClientPaymentMethod" AS ENUM ('NONCASH', 'CASH', 'CARD', 'ADVANCE');

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "deferralEndAt" TIMESTAMP(3),
ADD COLUMN     "deferralStartAt" TIMESTAMP(3),
ADD COLUMN     "deferralTerms" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'WAITING';

-- CreateTable
CREATE TABLE "ClientPayment" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "method" "ClientPaymentMethod" NOT NULL DEFAULT 'NONCASH',
    "comment" TEXT,
    "actorId" TEXT NOT NULL,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientPayment_fileId_key" ON "ClientPayment"("fileId");

-- CreateIndex
CREATE INDEX "ClientPayment_dealId_paidAt_idx" ON "ClientPayment"("dealId", "paidAt");

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
