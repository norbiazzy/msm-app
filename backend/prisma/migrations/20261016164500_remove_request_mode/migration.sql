-- Remove obsolete requestMode field
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "requestMode";
