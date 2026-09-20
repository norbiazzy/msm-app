# Changelog

Все заметные изменения MSM App фиксируются здесь.

## [0.1.2] - 2026-09-20

### Добавлено
- Базовый Telegram Mini App на React + TypeScript + Vite.
- Backend на NestJS.
- Prisma/PostgreSQL фундамент.
- Роли и dev-auth фундамент.
- Создание сделки/ЗК и задачи «Выставить счёт».
- Загрузка готового счёта.
- Telegram file storage фундамент через `file_id`.

### Исправлено
- Vite proxy переведён на `127.0.0.1:3001` для Windows/IPv6-совместимости.

### Безопасность
- `backend/.env` исключён из Git. В репозитории хранится только `.env.example`.
