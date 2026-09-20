> В этой сборке `backend/.env` уже заполнен данными Telegram-бота и локальной БД.

# Быстрый запуск на Windows

1. Установить Node.js 22 LTS и Docker Desktop.
2. Распаковать проект.
3. Открыть PowerShell в папке `msm-app`.
4. Выполнить:

```powershell
npm install
docker compose up -d
Copy-Item backend/.env.example backend/.env
cd backend
npm run prisma:generate
npm run prisma:migrate -- --name init
cd ..
```

5. Заполнить `backend/.env` токеном Telegram-бота и ID архивного чата.
6. Открыть два PowerShell:

Окно 1:
```powershell
npm run dev:backend
```

Окно 2:
```powershell
npm run dev:frontend
```

7. Менеджер: http://localhost:5173/?devRole=MANAGER
8. Бухгалтер: http://localhost:5173/?devRole=ACCOUNTANT


## Если Vite пишет `http proxy error`

Сначала проверьте backend отдельно:

```powershell
Invoke-WebRequest http://127.0.0.1:3001
```

В окне backend после запуска должна появиться строка:

```text
MSM backend: http://127.0.0.1:3001
```

Если `Invoke-WebRequest` не отвечает, проблема не во frontend — backend не запущен или завершился с ошибкой.

В этой версии Vite проксирует запросы на `127.0.0.1:3001`, а не на `localhost`, чтобы избежать конфликта IPv4/IPv6 в Windows.
