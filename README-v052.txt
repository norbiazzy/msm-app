MSM v0.5.2 — единый стиль файлов + входящий счёт в возврате бухгалтерии

1. Положите update-v052-files.patch в D:\job\it\msm-app
2. Проверка:
   git apply --check .\update-v052-files.patch
3. Применение:
   git apply .\update-v052-files.patch
4. Проверка:
   git diff --check
   npm run build

Миграция Prisma не требуется.
