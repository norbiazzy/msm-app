const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const file = path.join(
  root,
  'frontend',
  'src',
  'PurchasesBlock.tsx'
);

const marker =
  'PART_V064_O22_H1_SUPPLIER_TASK_DEAL_ID';

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

if (!fs.existsSync(file)) {
  fail('Не найден frontend/src/PurchasesBlock.tsx');
}

const raw =
  fs.readFileSync(file, 'utf8');

const crlf =
  raw.includes('\r\n');

let text =
  raw.replace(/\r\n/g, '\n');

if (text.includes(marker)) {
  console.log('v064-O2.2 H1 уже установлен.');
  process.exit(0);
}

if (
  !text.includes(
    'PART_V064_O22_EXISTING_DEAL_UPLOAD_PROGRESS'
  )
) {
  fail(
    'O2.2 не найден. Hotfix рассчитан только на установленный O2.2.'
  );
}

const start =
  text.indexOf(
    'export function SupplierPaymentTask('
  );

if (start < 0) {
  fail(
    'SupplierPaymentTask не найден.'
  );
}

const nextExport =
  text.indexOf(
    '\nexport function ',
    start + 20
  );

const end =
  nextExport > start
    ? nextExport
    : text.length;

let block =
  text.slice(start, end);

/*
  O2.2 добавил dealId: deal.id во все jobs PurchasesBlock.
  Но внутри SupplierPaymentTask переменной deal нет —
  здесь источник сделки task.deal.
*/
const wrongRegex =
  /dealId:\s*\n\s*deal\.id,/g;

const wrongCount =
  (block.match(wrongRegex) || []).length;

if (wrongCount !== 2) {
  fail(
    'В SupplierPaymentTask ожидалось ровно 2 ошибочных dealId: deal.id, найдено ' +
    wrongCount +
    '. Файлы не изменены.'
  );
}

block =
  block.replace(
    wrongRegex,
`dealId:
          task.deal.id,`
  );

/* Маркер ставим рядом с первой исправленной привязкой. */
block =
  block.replace(
`dealId:
          task.deal.id,`,
`// ${marker}
        dealId:
          task.deal.id,`
  );

if (
  /\bdealId:\s*\n\s*deal\.id,/.test(
    block
  )
) {
  fail(
    'После преобразования в SupplierPaymentTask остался dealId: deal.id.'
  );
}

const taskDealIdCount =
  (
    block.match(
      /dealId:\s*\n\s*task\.deal\.id,/g
    ) || []
  ).length;

if (taskDealIdCount < 2) {
  fail(
    'После преобразования найдено меньше 2 dealId: task.deal.id.'
  );
}

text =
  text.slice(0, start) +
  block +
  text.slice(end);

console.log('');
console.log(
  'v064-O2.2 H1 — SupplierPaymentTask dealId'
);
console.log(
  '========================================'
);
console.log(
  'OK   2 ошибочных deal.id найдены'
);
console.log(
  'OK   заменены на task.deal.id'
);
console.log(
  'OK   остальные части O2.2 не меняются'
);

if (checkOnly) {
  console.log('');
  console.log(
    'CHECK ONLY — файлы не изменены.'
  );
  process.exit(0);
}

const stamp =
  new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

const backup =
  file +
  '.before-v064-o22-h1-' +
  stamp;

fs.copyFileSync(file, backup);

console.log(
  'Backup: ' +
  path.relative(root, backup)
);

fs.writeFileSync(
  file,
  crlf
    ? text.replace(/\n/g, '\r\n')
    : text,
  'utf8'
);

console.log('');
console.log(
  'v064-O2.2 H1 применён.'
);
