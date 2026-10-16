-- MSM workflow stages independent of technical deal status.
CREATE TYPE "DealWorkflowMode" AS ENUM ('AUTO', 'MANUAL');
CREATE TYPE "DealWorkflowStage" AS ENUM ('PREPARING_QUOTE','REVIEW','AGREED','CANCELLED','PREPARING_SHIPMENT','DELIVERY','SHIPPED');
ALTER TABLE "Deal" ADD COLUMN "workflowMode" "DealWorkflowMode" NOT NULL DEFAULT 'AUTO';
ALTER TABLE "Deal" ADD COLUMN "workflowStage" "DealWorkflowStage";
ALTER TABLE "Deal" ADD COLUMN "workflowReason" TEXT;
