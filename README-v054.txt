MSM v0.5.4

1. Put update-v054-request-edit-upload.patch into D:\job\it\msm-app
2. Check:
   git apply --check .\update-v054-request-edit-upload.patch
3. Apply:
   git apply .\update-v054-request-edit-upload.patch
4. Verify:
   git diff --check
   npm run build

No Prisma migration is required.
