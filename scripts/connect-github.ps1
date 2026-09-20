param(
    [Parameter(Mandatory=$true)]
    [string]$RepoUrl
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git не найден. Установите Git for Windows и перезапустите PowerShell."
}

if (-not (Test-Path ".git")) {
    git init
}

git branch -M main

$origin = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0 -and $origin) {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}

Write-Host "Проверяю, что backend/.env не отслеживается..."
if (Test-Path "backend/.env") {
    $tracked = git ls-files --error-unmatch backend/.env 2>$null
    if ($LASTEXITCODE -eq 0) {
        git rm --cached backend/.env
        Write-Host "backend/.env удален из индекса Git, локальный файл сохранен."
    }
}

git push -u origin main
git push origin --tags

Write-Host "Готово. Репозиторий подключен: $RepoUrl"
