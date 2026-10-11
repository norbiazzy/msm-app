param(
  [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

$AppPath = Join-Path $Root 'frontend\src\App.tsx'
$QueuePath = Join-Path $Root 'frontend\src\invoiceSubmissionQueue.ts'
$BackgroundPath = Join-Path $Root 'frontend\src\backgroundUploads.tsx'
$InvoiceServicePath = Join-Path $Root 'backend\src\invoices\invoices.service.ts'

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-Utf8([string]$Path) {
  return [System.IO.File]::ReadAllText(
    $Path,
    [System.Text.Encoding]::UTF8
  )
}

function Write-Utf8(
  [string]$Path,
  [string]$Text
) {
  [System.IO.File]::WriteAllText(
    $Path,
    $Text,
    $Utf8NoBom
  )
}

if (!(Test-Path $AppPath)) {
  throw "Не найден App.tsx: $AppPath"
}

if (!(Test-Path $BackgroundPath)) {
  throw "Не найден backgroundUploads.tsx"
}

if (!(Test-Path $InvoiceServicePath)) {
  throw "Не найден invoices.service.ts"
}

$BackgroundText = Read-Utf8 $BackgroundPath
$InvoiceServiceText = Read-Utf8 $InvoiceServicePath

if (
  !$BackgroundText.Contains(
    'retryOnReconnect'
  )
) {
  throw "Part 1G не найден: в backgroundUploads.tsx нет retryOnReconnect."
}

if (
  !$InvoiceServiceText.Contains(
    'activeInvoiceTask'
  )
) {
  throw "Part 1F не найден: защита createInvoice от дублей ещё не установлена."
}

$App = Read-Utf8 $AppPath

$ImportAnchor = @"
import {
  clearInvoiceTaskDraft,
  loadInvoiceTaskDraftFiles,
  readInvoiceTaskDraftFields,
  saveInvoiceTaskDraftFields,
  saveInvoiceTaskDraftFiles,
} from './invoiceTaskDraft';
"@

$QueueImport = @"
import {
  resumePendingInvoiceSubmissions,
  startInvoiceSubmission,
} from './invoiceSubmissionQueue';
"@

if (
  !$App.Contains(
    $QueueImport.Trim()
  )
) {

  if (
    !$App.Contains(
      $ImportAnchor.Trim()
    )
  ) {
    throw "Не найден ожидаемый import invoiceTaskDraft в App.tsx."
  }

  $App = $App.Replace(
    $ImportAnchor.Trim(),
    $ImportAnchor.Trim() +
      "`r`n" +
      $QueueImport.Trim()
  )
}

$ResumeEffect = @"
  useEffect(() => {
    if (!user) return;

    void resumePendingInvoiceSubmissions(
      user.id
    );
  }, [user?.id]);

"@

if (
  !$App.Contains(
    'resumePendingInvoiceSubmissions('
  )
) {

  $LoginEnd = @"
    })();
  }, []);
"@

  $LoginEndIndex =
    $App.IndexOf(
      $LoginEnd.Trim()
    )

  if (
    $LoginEndIndex -lt 0
  ) {
    throw "Не найден конец login useEffect в App.tsx."
  }

  $InsertAt =
    $LoginEndIndex +
    $LoginEnd.Trim().Length

  $App =
    $App.Substring(0, $InsertAt) +
    "`r`n`r`n" +
    $ResumeEffect.TrimEnd() +
    "`r`n" +
    $App.Substring($InsertAt)
}

$StartMarker =
  '  function finishInvoice() {'

$AlreadyAsyncMarker =
  '  async function finishInvoice() {'

$EndMarker =
  '  const canAttachInvoice ='

$StartIndex =
  $App.IndexOf(
    $StartMarker
  )

if ($StartIndex -lt 0) {
  $StartIndex =
    $App.IndexOf(
      $AlreadyAsyncMarker
    )
}

$EndIndex =
  $App.IndexOf(
    $EndMarker
  )

if ($StartIndex -lt 0) {
  throw "Не найден finishInvoice() в App.tsx."
}

if (
  $EndIndex -lt 0 -or
  $EndIndex -le $StartIndex
) {
  throw "Не найден конец блока finishInvoice() в App.tsx."
}

$NewFinish = @"
  async function finishInvoice() {

    setError('');


    const filesToUpload =
      [...invoiceFiles];


    if (filesToUpload.length === 0) {
      setError(
        'Прикрепите файл готового счёта.'
      );
      return;
    }


    const numberToSave =
      number.trim();


    const amountToSave =
      parseMoneyInput(amount);


    setSaving(true);


    try {

      await startInvoiceSubmission({

        taskId:
          task.id,

        dealId:
          task.deal.id,

        clientName:
          task.deal.clientName,

        number:
          numberToSave,

        amount:
          amountToSave,

        invoiceDate:
          todayLocalDate(),

        actorId:
          user.id,

        files:
          filesToUpload,
      });


      onBack();

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );

      setSaving(false);
    }
  }


"@

$App =
  $App.Substring(0, $StartIndex) +
  $NewFinish.TrimStart([char[]]"`r`n") +
  $App.Substring($EndIndex)

Write-Host ""
Write-Host "Проверка Part 1H:"
Write-Host "  Part 1F: OK"
Write-Host "  Part 1G: OK"
Write-Host "  App.tsx markers: OK"
Write-Host "  Новый queue-файл: OK"

if ($CheckOnly) {
  Write-Host ""
  Write-Host "CHECK ONLY — файлы не изменены."
  exit 0
}

$BackupPath =
  $AppPath +
  '.before-part1h-' +
  (Get-Date -Format 'yyyyMMdd-HHmmss')

Copy-Item $AppPath $BackupPath

Write-Utf8 $AppPath $App

$QueueSourcePath =
  Join-Path $Root 'invoiceSubmissionQueue.part1h.tmp'

if (!(Test-Path $QueueSourcePath)) {
  throw "Не найден временный файл invoiceSubmissionQueue.part1h.tmp рядом со скриптом."
}

$QueueSource =
  Read-Utf8 $QueueSourcePath

Write-Utf8 $QueuePath $QueueSource

Write-Host ""
Write-Host "Part 1H применён."
Write-Host "Backup App.tsx:"
Write-Host "  $BackupPath"
Write-Host ""
Write-Host "Дальше:"
Write-Host "  git diff --check"
Write-Host "  cd frontend"
Write-Host "  npm run build"
