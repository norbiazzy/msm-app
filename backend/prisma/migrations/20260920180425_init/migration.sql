-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MANAGER', 'ACCOUNTANT', 'LEADER', 'ADMIN');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('ST', 'MSM', 'IP');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('ISSUE_CLIENT_INVOICE', 'CORRECT_CLIENT_INVOICE', 'PAY_SUPPLIER', 'POWER_OF_ATTORNEY', 'ETRN', 'NEED_DATA', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'NEED_DATA', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('WAITING_ACCOUNTING', 'WAITING_MANAGER_REVIEW', 'CONFIRMED', 'CORRECTION_REQUESTED');

-- CreateEnum
CREATE TYPE "FileProvider" AS ENUM ('TELEGRAM', 'EXTERNAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "telegramUsername" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MANAGER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "internalNumber" SERIAL NOT NULL,
    "sellerType" "SellerType" NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "contactName" TEXT,
    "leadSource" TEXT,
    "managerComment" TEXT,
    "accountingComment" TEXT,
    "requestMode" TEXT NOT NULL,
    "requestText" TEXT,
    "marginMode" TEXT,
    "marginValue" DECIMAL(14,2),
    "status" "DealStatus" NOT NULL DEFAULT 'ACTIVE',
    "plannedShipmentAt" TIMESTAMP(3),
    "managerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientInvoice" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "sellerType" "SellerType" NOT NULL,
    "number" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3),
    "amount" DECIMAL(14,2),
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'WAITING_MANAGER_REVIEW',
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'NEW',
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "provider" "FileProvider" NOT NULL DEFAULT 'TELEGRAM',
    "category" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "telegramFileId" TEXT,
    "telegramUniqueId" TEXT,
    "telegramMessageId" INTEGER,
    "telegramChatId" TEXT,
    "externalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_internalNumber_key" ON "Deal"("internalNumber");

-- CreateIndex
CREATE INDEX "Deal_managerId_status_idx" ON "Deal"("managerId", "status");

-- CreateIndex
CREATE INDEX "Deal_clientName_idx" ON "Deal"("clientName");

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvoice_fileId_key" ON "ClientInvoice"("fileId");

-- CreateIndex
CREATE INDEX "ClientInvoice_dealId_isCurrent_idx" ON "ClientInvoice"("dealId", "isCurrent");

-- CreateIndex
CREATE INDEX "ClientInvoice_number_idx" ON "ClientInvoice"("number");

-- CreateIndex
CREATE INDEX "Task_status_urgent_idx" ON "Task"("status", "urgent");

-- CreateIndex
CREATE INDEX "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "StoredFile_dealId_category_idx" ON "StoredFile"("dealId", "category");

-- CreateIndex
CREATE INDEX "AuditEvent_dealId_createdAt_idx" ON "AuditEvent"("dealId", "createdAt");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvoice" ADD CONSTRAINT "ClientInvoice_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvoice" ADD CONSTRAINT "ClientInvoice_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
