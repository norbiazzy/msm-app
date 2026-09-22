MSM v0.5.0 — invoice request workflow

Apply from D:\job\it\msm-app

1) Check only:
   git apply --check .\update-v050-invoice-workflow.patch

2) Apply:
   git apply .\update-v050-invoice-workflow.patch

3) Verify:
   git diff --check
   npm run build

No Prisma migration is required for this patch.
