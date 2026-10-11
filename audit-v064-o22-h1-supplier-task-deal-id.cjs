const fs = require('fs');
const path = require('path');

const root = __dirname;

const file =
  path.join(
    root,
    'frontend',
    'src',
    'PurchasesBlock.tsx'
  );

const text =
  fs.existsSync(file)
    ? fs
        .readFileSync(file, 'utf8')
        .replace(/\r\n/g, '\n')
    : '';

const start =
  text.indexOf(
    'export function SupplierPaymentTask('
  );

const nextExport =
  text.indexOf(
    '\nexport function ',
    start + 20
  );

const end =
  nextExport > start
    ? nextExport
    : text.length;

const block =
  start >= 0
    ? text.slice(start, end)
    : '';

const checks = [
  [
    text.includes(
      'PART_V064_O22_H1_SUPPLIER_TASK_DEAL_ID'
    ),
    'hotfix установлен'
  ],
  [
    !/\bdealId:\s*\n\s*deal\.id,/.test(
      block
    ),
    'в SupplierPaymentTask нет deal.id'
  ],
  [
    (
      block.match(
        /dealId:\s*\n\s*task\.deal\.id,/g
      ) || []
    ).length >= 2,
    'оба background job используют task.deal.id'
  ],
  [
    block.includes(
      "'Отправляем оплату'"
    ),
    'задача оплаты сохранена'
  ],
  [
    block.includes(
      "'Загружаем платёжку с печатью'"
    ),
    'задача платёжки сохранена'
  ],
];

console.log('');
console.log(
  'MSM — аудит v064-O2.2 H1'
);
console.log(
  '========================='
);

let bad = false;

for (const [ok, label] of checks) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );
  if (!ok) bad = true;
}

console.log('');

if (bad) {
  console.log('ИТОГ: есть ошибки.');
  process.exit(1);
}

console.log(
  'ИТОГ: OK — SupplierPaymentTask использует task.deal.id.'
);
