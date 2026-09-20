$ErrorActionPreference = "Stop"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git не найден."
}
if (-not (Test-Path ".git")) {
    throw "Эта папка не является Git-репозиторием."
}

Write-Host "1/4 Получаю изменения..."
git pull --ff-only

Write-Host "2/4 Обновляю зависимости..."
npm install

Write-Host "3/4 Обновляю Prisma Client..."
Push-Location backend
npx prisma generate

if (Test-Path "prisma/migrations") {
    Write-Host "4/4 Применяю миграции базы..."
    npx prisma migrate deploy
} else {
    Write-Host "4/4 Миграций пока нет."
}
Pop-Location

Write-Host "Обновление завершено. backend/.env не изменялся."
