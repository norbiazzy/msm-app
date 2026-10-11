const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail('Не найден файл: ' + file);
  }
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.writeFileSync(file, text, 'utf8');
}

let app = read(appPath);

if (!app.includes('PART_1N_J1_TS_INVOICE_NEED_DATA')) {
  const anchor = 'const invoiceRequestTask =';
  const anchorIndex = app.indexOf(anchor);

  if (anchorIndex < 0) {
    fail('Не найден invoiceRequestTask.');
  }

  const semicolonIndex = app.indexOf(';', anchorIndex);

  if (semicolonIndex < 0) {
    fail('Не найден конец объявления invoiceRequestTask.');
  }

  const helper = `

  // PART_1N_J1_TS_INVOICE_NEED_DATA
  const invoiceRequestNeedsData =
    Boolean(
      invoiceRequestTask &&
      invoiceRequestTask.status ===
        'NEED_DATA'
    );
`;

  app =
    app.slice(0, semicolonIndex + 1) +
    helper +
    app.slice(semicolonIndex + 1);
}

let replaced = 0;

app = app.replace(
  /invoiceRequestTask\?\.\s*status\s*===\s*['"]NEED_DATA['"]/g,
  () => {
    replaced++;
    return 'invoiceRequestNeedsData';
  }
);

app = app.replace(
  /invoiceRequestTask\.\s*status\s*===\s*['"]NEED_DATA['"]/g,
  () => {
    replaced++;
    return 'invoiceRequestNeedsData';
  }
);

if (
  /invoiceRequestTask\?\.\s*status\s*===\s*['"]NEED_DATA['"]/.test(app)
) {
  fail('Осталась проблемная optional-chain проверка NEED_DATA.');
}

if (!app.includes('PART_1N_J1_TS_INVOICE_NEED_DATA')) {
  fail('Helper invoiceRequestNeedsData не добавлен.');
}

console.log('');
console.log('Проверка frontend hotfix:');
console.log('  invoiceRequestTask?.status NEED_DATA убран: OK');
console.log('  invoiceRequestNeedsData helper добавлен: OK');
console.log('  Backend не меняется');
console.log('  Prisma migration не нужна');

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

fs.copyFileSync(
  appPath,
  appPath + '.before-part1n-j1-ts-hotfix-' + stamp
);

write(appPath, app);

console.log('');
console.log('Frontend TS hotfix применён.');
console.log('');
console.log('Дальше:');
console.log('  npm run build');
