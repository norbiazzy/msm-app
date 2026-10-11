const fs = require('fs');
const path = require('path');

const root = __dirname;

const candidates = [
  ['frontend/src/StructuredTaskCreatePanel.tsx', 'CREATE'],
  ['frontend/src/TaskStructuredFields.tsx', 'DISPLAY'],
  ['frontend/src/ManagerResubmitPanel.tsx', 'RESUBMIT'],
  ['frontend/src/PowerOfAttorneyBlock.tsx', 'POA_BLOCK'],
  ['frontend/src/App.tsx', 'APP'],
  ['frontend/src/api.ts', 'API'],
  ['frontend/src/types.ts', 'TYPES'],
];

const needles = [
  'POWER_OF_ATTORNEY',
  'Доверен',
  'supplierOrFactory',
  'organization',
  'attorneyPerson',
  'incomingInvoiceNumber',
  'date',
  'items',
  'drivers',
  'driverComment',
  'accountingComment',
  'managerComment',
  'urgent',
  'powerOfAttorney',
  'poa',
];

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function printWindow(text, index, before = 38, after = 85) {
  const lines = text.split('\n');
  const line = lineOf(text, index);
  const start = Math.max(0, line - 1 - before);
  const end = Math.min(lines.length, line + after);

  for (let i = start; i < end; i++) {
    console.log(
      String(i + 1).padStart(5, ' ') +
      ' | ' +
      lines[i]
    );
  }
}

function printMatches(file, text, label) {
  console.log('');
  console.log('============================================================');
  console.log(label + ' — ' + file);
  console.log('============================================================');

  let any = false;
  const shown = new Set();

  for (const needle of needles) {
    let cursor = 0;
    let count = 0;

    while (true) {
      const idx = text.indexOf(needle, cursor);
      if (idx < 0) break;

      count++;

      const line = lineOf(text, idx);
      const bucket = Math.floor(line / 80);

      if (!shown.has(bucket) && shown.size < 14) {
        shown.add(bucket);
        any = true;

        console.log('');
        console.log(
          `### ${needle} — строка ${line}`
        );
        printWindow(text, idx);
      }

      cursor = idx + needle.length;
    }

    if (count > 0) {
      console.log(
        `COUNT ${needle.padEnd(24, ' ')} : ${count}`
      );
    }
  }

  if (!any) {
    console.log('Нет релевантных совпадений.');
  }
}

console.log('');
console.log('MSM — аудит доверенности v062');
console.log('=============================');
console.log('');
console.log('Ничего не изменяет.');
console.log('');

let foundAnyFile = false;

for (const [rel, label] of candidates) {
  const file = path.join(root, ...rel.split('/'));

  if (!fs.existsSync(file)) {
    console.log(`MISS ${rel}`);
    continue;
  }

  foundAnyFile = true;

  const text = fs.readFileSync(file, 'utf8');
  printMatches(rel, text, label);
}

if (!foundAnyFile) {
  console.error('');
  console.error('ОШИБКА: не найден ни один ожидаемый frontend-файл.');
  process.exit(1);
}

console.log('');
console.log('============================================================');
console.log('СВОДКА ПОЛЕЙ');
console.log('============================================================');

for (const [rel] of candidates) {
  const file = path.join(root, ...rel.split('/'));
  if (!fs.existsSync(file)) continue;

  const text = fs.readFileSync(file, 'utf8');
  const hits = [
    'supplierOrFactory',
    'organization',
    'attorneyPerson',
    'incomingInvoiceNumber',
    'date',
    'items',
    'drivers',
    'driverComment',
    'accountingComment',
    'managerComment',
    'urgent',
  ]
    .map(
      (key) =>
        `${key}=${text.split(key).length - 1}`
    )
    .join('  ');

  console.log(rel);
  console.log('  ' + hits);
}

console.log('');
console.log('ГОТОВО — пришлите весь вывод этого аудита.');
