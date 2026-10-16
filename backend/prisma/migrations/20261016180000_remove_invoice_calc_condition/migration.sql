-- MSM step37: obsolete invoice request calculation condition.
-- Payment status, deferral terms and supplier purchase payments are unchanged.
ALTER TABLE "Deal"
  DROP COLUMN IF EXISTS "marginMode",
  DROP COLUMN IF EXISTS "marginValue";
