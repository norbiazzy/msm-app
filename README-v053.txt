MSM v0.5.3 — изменение СТ / МСМ / ИП до выставления счета

1. Положите update-v053-seller-type.patch в D:\job\it\msm-app
2. Проверка:
   git apply --check .\update-v053-seller-type.patch
3. Применение:
   git apply .\update-v053-seller-type.patch
4. Проверка:
   git diff --check
   npm run build

Миграция Prisma не требуется.
