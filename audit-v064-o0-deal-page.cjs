const fs = require('fs');
const path = require('path');

const root = __dirname;

const files = [
  'frontend/src/App.tsx',
  'frontend/src/PurchasesBlock.tsx',
  'frontend/src/PowerOfAttorneyBlock.tsx',
  'frontend/src/styles.css',
  'frontend/src/types.ts',
];

function read(rel) {
  const full = path.join(root, rel);

  if (!fs.existsSync(full)) {
    console.log('');
    console.log('MISSING:', rel);
    return null;
  }

  return fs
    .readFileSync(full, 'utf8')
    .replace(/\r\n/g, '\n');
}

function lineOf(text, index) {
  return text
    .slice(0, index)
    .split('\n')
    .length;
}

function showAround(
  rel,
  text,
  pattern,
  before = 80,
  after = 180,
) {
  const index =
    text.indexOf(pattern);

  console.log('');
  console.log('============================================================');
  console.log('FILE:', rel);
  console.log('PATTERN:', JSON.stringify(pattern));

  if (index < 0) {
    console.log('NOT FOUND');
    return;
  }

  const lines =
    text.split('\n');

  const line =
    lineOf(text, index);

  const from =
    Math.max(
      1,
      line - before
    );

  const to =
    Math.min(
      lines.length,
      line + after
    );

  console.log(
    `LINES ${from}-${to} (match ${line})`
  );

  for (
    let n = from;
    n <= to;
    n++
  ) {
    const mark =
      n === line
        ? '>>'
        : '  ';

    console.log(
      mark +
      String(n)
        .padStart(5, ' ') +
      ' | ' +
      lines[n - 1]
    );
  }
}

function printFunctionList(
  rel,
  text,
) {
  console.log('');
  console.log('============================================================');
  console.log('FUNCTIONS:', rel);

  const re =
    /^(?:export\s+)?function\s+([A-Za-z0-9_]+)\s*\(|^(?:export\s+)?async\s+function\s+([A-Za-z0-9_]+)\s*\(/gm;

  let match;

  while (
    (match = re.exec(text))
  ) {
    const name =
      match[1] ||
      match[2];

    console.log(
      String(
        lineOf(
          text,
          match.index
        )
      ).padStart(5, ' ') +
      ' | ' +
      name
    );
  }
}

console.log(
  'MSM — точный аудит страницы сделки'
);
console.log(
  'READ ONLY — НИЧЕГО НЕ МЕНЯЕТ'
);
console.log(
  'ROOT:',
  root
);

const app =
  read(
    'frontend/src/App.tsx'
  );

if (app) {
  printFunctionList(
    'frontend/src/App.tsx',
    app
  );

  [
    'getDeal(',
    'selectedDealId',
    '<PurchasesBlock',
    '<PowerOfAttorneyBlock',
    'clientPayments',
    'paymentStatus',
    'deliveryAddresses',
    'Редактировать',
    'Доверен',
    'Закуп',
    'Счёт',
  ].forEach(
    (pattern) =>
      showAround(
        'frontend/src/App.tsx',
        app,
        pattern,
        70,
        170,
      )
  );
}

const purchases =
  read(
    'frontend/src/PurchasesBlock.tsx'
  );

if (purchases) {
  printFunctionList(
    'frontend/src/PurchasesBlock.tsx',
    purchases
  );

  [
    'export function PurchasesBlock',
    'Закуп',
    'Поставщик',
    'incomingInvoiceNumber',
    'supplierPurchases',
    'return (',
  ].forEach(
    (pattern) =>
      showAround(
        'frontend/src/PurchasesBlock.tsx',
        purchases,
        pattern,
        50,
        140,
      )
  );
}

const power =
  read(
    'frontend/src/PowerOfAttorneyBlock.tsx'
  );

if (power) {
  [
    'export function PowerOfAttorneyBlock',
    'Доверенности',
    'POWER_OF_ATTORNEY_RESULT_',
  ].forEach(
    (pattern) =>
      showAround(
        'frontend/src/PowerOfAttorneyBlock.tsx',
        power,
        pattern,
        40,
        100,
      )
  );
}

const styles =
  read(
    'frontend/src/styles.css'
  );

if (styles) {
  [
    '.deal',
    '.detail',
    '.purchase',
    '.power',
    '.payment',
    '.bo',
    '@media (max-width: 720px)',
  ].forEach(
    (pattern) =>
      showAround(
        'frontend/src/styles.css',
        styles,
        pattern,
        20,
        80,
      )
  );
}

const types =
  read(
    'frontend/src/types.ts'
  );

if (types) {
  [
    'export type Deal =',
    'export type Invoice =',
    'export type SupplierPurchase =',
  ].forEach(
    (pattern) =>
      showAround(
        'frontend/src/types.ts',
        types,
        pattern,
        20,
        90,
      )
  );
}

console.log('');
console.log('============================================================');
console.log(
  'ГОТОВО. Пришли весь вывод от начала до конца.'
);
console.log(
  'Скрипт только читает файлы и ничего не меняет.'
);
