const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const target =
  path.join(
    root,
    'frontend',
    'src',
    'BlockOfficeHome.tsx'
  );

function fail(message) {
  console.error('');
  console.error(
    'ОШИБКА: ' + message
  );
  process.exit(1);
}

if (!fs.existsSync(target)) {
  fail(
    'Не найден frontend/src/BlockOfficeHome.tsx'
  );
}

const raw =
  fs.readFileSync(
    target,
    'utf8'
  );

const crlf =
  raw.includes('\r\n');

let text =
  raw.replace(
    /\r\n/g,
    '\n'
  );

const marker =
  'PART_V064_O12_V2_INVOICE_ORG_LABEL';

if (
  text.includes(marker)
) {
  console.log('');
  console.log(
    'v064-O1.2 v2 уже установлен.'
  );
  process.exit(0);
}

const required = [
  'Внутр. №',
  'Счёт',
  'Сумма',
  'Статус',
  'Комментарий',
];

for (const value of required) {
  if (!text.includes(value)) {
    fail(
      'BlockOfficeHome.tsx не похож на текущую таблицу сделок: нет «' +
      value +
      '».'
    );
  }
}

/*
 * В нужной колонке сейчас отображается номер в виде:
 * №{invoice.number}
 *
 * Имя переменной может быть invoice/currentInvoice/etc.
 * Ищем только внутри BlockOfficeHome.tsx.
 */
const pattern =
  /№\s*\{\s*([A-Za-z_$][\w$]*)\.number\s*\}/g;

const matches =
  [...text.matchAll(pattern)];

if (matches.length !== 1) {
  console.log('');
  console.log(
    'Совпадений формата №{...number}: ' +
    matches.length
  );

  fail(
    'Не удалось однозначно найти ячейку номера счёта. Ничего не изменено.'
  );
}

const invoiceVar =
  matches[0][1];

text =
  text.replace(
    pattern,
    `{dealSellerShortLabel(${invoiceVar}.sellerType || deal.sellerType)}-{${invoiceVar}.number}`
  );

const helper =
`
// ${marker}
function dealSellerShortLabel(
  type?: string,
) {
  if (type === 'ST') {
    return 'СТ';
  }

  if (type === 'IP') {
    return 'ИП';
  }

  return 'МСМ';
}
// END_${marker}

`;

const firstFunction =
  text.search(
    /(?:export\s+)?function\s+[A-Za-z_$]/
  );

if (firstFunction < 0) {
  fail(
    'Не найдено место для helper-функции.'
  );
}

text =
  text.slice(
    0,
    firstFunction
  ) +
  helper +
  text.slice(
    firstFunction
  );

const checks = [
  [
    text.includes(marker),
    'helper продавца'
  ],
  [
    text.includes(
      `dealSellerShortLabel(${invoiceVar}.sellerType || deal.sellerType)`
    ),
    'организация берётся из счёта/сделки'
  ],
  [
    text.includes(
      `-{${invoiceVar}.number}`
    ),
    'номер счёта сохранён'
  ],
  [
    !text.includes(
      `№{${invoiceVar}.number}`
    ),
    'старый формат №123 убран'
  ],
];

console.log('');
console.log(
  'v064-O1.2 v2 — организация + номер счёта'
);
console.log(
  '======================================='
);
console.log(
  'Файл: frontend/src/BlockOfficeHome.tsx'
);
console.log(
  'Переменная счёта: ' +
  invoiceVar
);

for (
  const [ok, label]
  of checks
) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );

  if (!ok) {
    fail(
      'Проверка не пройдена: ' +
      label
    );
  }
}

console.log('');
console.log(
  'Будет отображаться: МСМ-1560 / СТ-1560 / ИП-1560'
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
    .replace(
      /[:.]/g,
      '-'
    );

const backup =
  target +
  '.before-v064-o12-v2-' +
  stamp;

fs.copyFileSync(
  target,
  backup
);

fs.writeFileSync(
  target,
  crlf
    ? text.replace(
        /\n/g,
        '\r\n'
      )
    : text,
  'utf8'
);

console.log('');
console.log(
  'v064-O1.2 v2 применён.'
);
console.log(
  'Изменён только frontend/src/BlockOfficeHome.tsx'
);
console.log(
  'Backup: ' + backup
);
