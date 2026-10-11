const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appPath = path.join(root, 'frontend', 'src', 'App.tsx');
const queuePath = path.join(root, 'frontend', 'src', 'invoiceSubmissionQueue.ts');
const queueSourcePath = path.join(root, 'invoiceSubmissionQueue.part1h.tmp');
const backgroundPath = path.join(root, 'frontend', 'src', 'backgroundUploads.tsx');
const invoiceServicePath = path.join(root, 'backend', 'src', 'invoices', 'invoices.service.ts');

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

for (const file of [appPath, backgroundPath, invoiceServicePath, queueSourcePath]) {
  if (!fs.existsSync(file)) {
    fail('Не найден файл: ' + file);
  }
}

const background = read(backgroundPath);
const invoiceService = read(invoiceServicePath);

if (!background.includes('retryOnReconnect')) {
  fail('Part 1G не найден: в backgroundUploads.tsx нет retryOnReconnect.');
}

if (!invoiceService.includes('activeInvoiceTask')) {
  fail('Part 1F не найден: в invoices.service.ts нет защиты от повторного createInvoice.');
}

let app = read(appPath);
const eol = app.includes('\r\n') ? '\r\n' : '\n';

function nl(text) {
  return text.replace(/\r?\n/g, eol);
}

const draftImport = nl(`import {
  clearInvoiceTaskDraft,
  loadInvoiceTaskDraftFiles,
  readInvoiceTaskDraftFields,
  saveInvoiceTaskDraftFields,
  saveInvoiceTaskDraftFiles,
} from './invoiceTaskDraft';`);

const queueImport = nl(`import {
  resumePendingInvoiceSubmissions,
  startInvoiceSubmission,
} from './invoiceSubmissionQueue';`);

if (!app.includes(queueImport)) {
  if (!app.includes(draftImport)) {
    fail('Не найден ожидаемый import из invoiceTaskDraft в App.tsx.');
  }

  app = app.replace(
    draftImport,
    draftImport + eol + queueImport
  );
}

const resumeEffect = nl(`  useEffect(() => {
    if (!user) return;

    void resumePendingInvoiceSubmissions(
      user.id
    );
  }, [user?.id]);`);

if (!app.includes('void resumePendingInvoiceSubmissions(')) {
  const appStart = app.indexOf('function App() {');

  if (appStart < 0) {
    fail('Не найден function App() в App.tsx.');
  }

  const loginMarker = nl(`    })();
  }, []);`);

  const loginEnd = app.indexOf(loginMarker, appStart);

  if (loginEnd < 0) {
    fail('Не найден конец login useEffect внутри App().');
  }

  const insertAt = loginEnd + loginMarker.length;

  app =
    app.slice(0, insertAt) +
    eol + eol +
    resumeEffect +
    eol +
    app.slice(insertAt);
}

const normalFinish = '  function finishInvoice() {';
const asyncFinish = '  async function finishInvoice() {';
let finishStart = app.indexOf(normalFinish);

if (finishStart < 0) {
  finishStart = app.indexOf(asyncFinish);
}

const finishEnd = app.indexOf(
  '  const canAttachInvoice =',
  finishStart
);

if (finishStart < 0) {
  fail('Не найден finishInvoice() в App.tsx.');
}

if (finishEnd < 0 || finishEnd <= finishStart) {
  fail('Не найден конец finishInvoice() перед canAttachInvoice.');
}

const currentFinish = app.slice(finishStart, finishEnd);

if (!currentFinish.includes('startInvoiceSubmission(')) {
  const newFinish = nl(`  async function finishInvoice() {

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


`);

  app =
    app.slice(0, finishStart) +
    newFinish +
    app.slice(finishEnd);
}

const queueSource = read(queueSourcePath);

console.log('');
console.log('Проверка Part 1H:');
console.log('  Part 1F: OK');
console.log('  Part 1G: OK');
console.log('  App.tsx markers: OK');
console.log('  invoiceSubmissionQueue.ts source: OK');

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

const backupPath =
  appPath + '.before-part1h-' + stamp;

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, app, 'utf8');
fs.writeFileSync(queuePath, queueSource, 'utf8');

console.log('');
console.log('Part 1H применён.');
console.log('Backup App.tsx:');
console.log('  ' + backupPath);
console.log('');
console.log('Дальше:');
console.log('  git diff --check');
console.log('  cd frontend');
console.log('  npm run build');
