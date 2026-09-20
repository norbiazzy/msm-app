# MSM Telegram Mini App — MVP 0.1

Первый технический каркас проекта для работы менеджеров и бухгалтерии со счетами через Telegram Mini App.

## Что уже реализовано

- React + TypeScript + Vite frontend.
- NestJS + TypeScript backend.
- PostgreSQL + Prisma schema.
- 4 роли: MANAGER, ACCOUNTANT, LEADER, ADMIN.
- Telegram Mini App auth с проверкой `initData`.
- Dev-авторизация для локального тестирования без Telegram.
- Создание запроса на счёт:
  - СТ / МСМ / ИП;
  - клиент и телефон;
  - позиции текстом / режим входящего счёта;
  - вариант наценки;
  - комментарий бухгалтерии;
  - личный комментарий менеджера;
  - флаг «Срочное».
- Автоматическое создание внутреннего ЗК и задачи «Выставить счёт».
- Список активных сделок.
- Список задач бухгалтерии.
- Действие «В работу».
- Загрузка готового счёта с номером/суммой/датой.
- Версионная модель клиентских счетов.
- Telegram как файловый архив:
  - backend отправляет файл в закрытый Telegram-чат/канал;
  - PostgreSQL хранит `file_id`, `file_unique_id`, message id и метаданные.
- Журнал событий (foundation).
- Поля для будущих модулей можно добавлять миграциями без переделки ядра.

## Структура

```text
msm-app/
├── frontend/              React/Vite Mini App
├── backend/               NestJS API
│   ├── prisma/            схема PostgreSQL
│   └── src/
│       ├── auth/
│       ├── deals/
│       ├── tasks/
│       ├── invoices/
│       ├── files/
│       └── prisma/
├── docker-compose.yml     локальный PostgreSQL
└── README.md
```

## Что понадобится на компьютере

1. Node.js 22+
2. Docker Desktop (самый простой способ запустить PostgreSQL)
3. Telegram-бот от BotFather
4. Закрытая Telegram-группа или канал для архива документов, куда бот добавлен администратором

## 1. Установка зависимостей

Из корня проекта:

```bash
npm install
```

## 2. PostgreSQL

```bash
docker compose up -d
```

Будет создана локальная база:

- database: `msm_app`
- user: `msm`
- password: `msm_dev_password`
- port: `5432`

## 3. Настройка backend

Скопировать:

```text
backend/.env.example -> backend/.env
```

Заполнить:

```env
PORT=3001
DATABASE_URL="postgresql://msm:msm_dev_password@localhost:5432/msm_app?schema=public"
TELEGRAM_BOT_TOKEN="токен_бота"
TELEGRAM_ARCHIVE_CHAT_ID="id_закрытого_чата_для_документов"
ALLOW_DEV_AUTH=true
```

### Telegram archive chat

Создайте закрытую группу/канал, например `MSM App — документы`.
Добавьте бота и дайте ему право отправлять сообщения/файлы.
`TELEGRAM_ARCHIVE_CHAT_ID` — ID этой группы/канала.

## 4. Создание БД

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate -- --name init
cd ..
```

## 5. Запуск

В первом терминале:

```bash
npm run dev:backend
```

Во втором:

```bash
npm run dev:frontend
```

Открыть:

```text
http://localhost:5173
```

## Локальное тестирование ролей

Без Telegram приложение работает в dev-режиме.

Менеджер:

```text
http://localhost:5173/?devRole=MANAGER
```

Бухгалтер:

```text
http://localhost:5173/?devRole=ACCOUNTANT
```

Руководитель:

```text
http://localhost:5173/?devRole=LEADER
```

Администратор:

```text
http://localhost:5173/?devRole=ADMIN
```

Удобный тест: открыть менеджера и бухгалтера в двух разных браузерах/профилях.

## Первый тестовый сценарий

### Менеджер

1. Открыть `?devRole=MANAGER`.
2. Нажать `+ Новый счёт`.
3. Выбрать МСМ.
4. Клиент: `ООО Главолснаб`.
5. Вставить позиции текстом.
6. Указать наценку и комментарий бухгалтерии.
7. При необходимости включить `Срочное`.
8. Нажать `Отправить бухгалтерии`.

Создастся `ЗК-N` и задача бухгалтерии.

### Бухгалтер

1. Открыть `?devRole=ACCOUNTANT`.
2. Перейти в `Задачи`.
3. Открыть «Выставить счёт».
4. Нажать `В работу`.
5. Открыть задачу ещё раз.
6. Ввести номер счёта, сумму, дату.
7. Прикрепить PDF.
8. Нажать `Счёт готов`.

PDF будет отправлен в Telegram-архив, а в сделке появится актуальный счёт.

## Telegram Mini App production

После локального теста нужно:

1. Разместить frontend по HTTPS.
2. Разместить backend по HTTPS.
3. В BotFather задать URL Mini App / Menu Button.
4. В production отключить:

```env
ALLOW_DEV_AUTH=false
```

Backend уже содержит проверку подписи `Telegram.WebApp.initData`.

## Файловая архитектура

Сейчас используется адаптер Telegram:

```text
Mini App -> Backend -> Telegram archive chat
                      ↓
               Telegram file_id
                      ↓
                  PostgreSQL
```

Позже можно добавить S3-хранилище, не меняя сущности сделок и документов.

## Следующие модули

После проверки первого сценария последовательно добавлять:

1. «Всё верно / Скорректировать» + версии счёта.
2. Оплаты клиента и статусы оплаты.
3. Поставщики и входящие счета.
4. Оплаты поставщикам + платёжка с печатью.
5. Доверенности.
6. ЭТРН.
7. Реализации Bonolit + ежедневные напоминания.
8. Закрытие сделки.
9. Месяц / зарплата.
10. Уведомления Telegram.
11. Справочники.
12. Integration layer для будущей 1С.

## Важно

Этот архив содержит исходный код, но зависимости (`node_modules`) в архив не включены. Их нужно установить командой `npm install`.

## Git и обновления

Проект подготовлен для Git. Секретный `backend/.env` не хранится в репозитории.
Подробная инструкция: `GIT_WORKFLOW.md`.
