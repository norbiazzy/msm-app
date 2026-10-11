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
  'PART_V064_O12_V4_INVOICE_ORG_LABEL';

if (text.includes(marker)) {
  console.log('');
  console.log(
    'v064-O1.2 v4 уже установлен.'
  );
  process.exit(0);
}

/* ---------------------------------------------------------
   1. sellerType у LooseInvoice
   --------------------------------------------------------- */

const looseRegex =
  /(type\s+LooseInvoice\s*=\s*\{\s*\n\s*id\?:\s*string;\s*\n)/;

const looseMatches =
  [...text.matchAll(
    new RegExp(
      looseRegex.source,
      'g'
    )
  )];

if (looseMatches.length !== 1) {
  fail(
    'Не удалось однозначно найти LooseInvoice. Ничего не изменено.'
  );
}

text =
  text.replace(
    looseRegex,
    `$1  sellerType?: 'ST' | 'MSM' | 'IP';\n`
  );

/* ---------------------------------------------------------
   2. helper
   --------------------------------------------------------- */

const helperAnchorRegex =
  /function\s+dealInvoice\s*\(\s*deal:\s*Deal,\s*\)\s*\{/;

const helperMatches =
  [...text.matchAll(
    new RegExp(
      helperAnchorRegex.source,
      'g'
    )
  )];

if (helperMatches.length !== 1) {
  fail(
    'Не удалось однозначно найти function dealInvoice.'
  );
}

const helper =
`// ${marker}
function invoiceSellerLabel(
  sellerType?: string,
) {
  if (sellerType === 'ST') {
    return 'СТ';
  }

  if (sellerType === 'IP') {
    return 'ИП';
  }

  return 'МСМ';
}
// END_${marker}


`;

text =
  text.replace(
    helperAnchorRegex,
    helper + helperMatches[0][0]
  );

/* ---------------------------------------------------------
   3. Карточный вид: "Счёт №1560" -> "МСМ-1560"
   --------------------------------------------------------- */

const cardRegex =
  /invoice\s*\?\s*'Счёт №'\s*\+\s*\(\s*invoice\.number\s*\|\|\s*invoice\s*\.invoiceNumber\s*\|\|\s*'—'\s*\)\s*:\s*'Счёт ещё не создан'/g;

const cardMatches =
  [...text.matchAll(cardRegex)];

if (cardMatches.length !== 1) {
  console.log(
    'Карточный формат найден: ' +
    cardMatches.length
  );

  fail(
    'Не удалось однозначно найти номер счёта в карточном виде. Ничего не изменено.'
  );
}

text =
  text.replace(
    cardRegex,
`invoice
                            ? invoiceSellerLabel(
                                invoice.sellerType ||
                                deal.sellerType
                              ) +
                              '-' +
                              (
                                invoice.number ||
                                invoice.invoiceNumber ||
                                '—'
                              )
                            : 'Счёт ещё не создан'`
  );

/* ---------------------------------------------------------
   4. Табличный вид: "№1560" -> "МСМ-1560"
   --------------------------------------------------------- */

const tableRegex =
  /invoice\s*\?\s*'№'\s*\+\s*\(\s*invoice\.number\s*\|\|\s*invoice\s*\.invoiceNumber\s*\|\|\s*'—'\s*\)\s*:\s*'—'/g;

const tableMatches =
  [...text.matchAll(tableRegex)];

if (tableMatches.length !== 1) {
  console.log(
    'Табличный формат найден: ' +
    tableMatches.length
  );

  fail(
    'Не удалось однозначно найти номер счёта в таблице. Ничего не изменено.'
  );
}

text =
  text.replace(
    tableRegex,
`invoice
                        ? invoiceSellerLabel(
                            invoice.sellerType ||
                            deal.sellerType
                          ) +
                          '-' +
                          (
                            invoice.number ||
                            invoice.invoiceNumber ||
                            '—'
                          )
                        : '—'`
  );

/* ---------------------------------------------------------
   CHECK
   --------------------------------------------------------- */

const checks = [
  [
    text.includes(marker),
    'helper организации'
  ],
  [
    text.includes(
      "sellerType?: 'ST' | 'MSM' | 'IP';"
    ),
    'sellerType счёта'
  ],
  [
    (
      text.match(
        /invoiceSellerLabel\(/g
      ) || []
    ).length === 3,
    'два отображения + helper'
  ],
  [
    !/invoice\s*\?\s*'Счёт №'\s*\+/.test(
      text
    ),
    'старый карточный формат убран'
  ],
  [
    !/invoice\s*\?\s*'№'\s*\+/.test(
      text
    ),
    'старый табличный формат убран'
  ],
];

console.log('');
console.log(
  'v064-O1.2 v4 — организация + номер счёта'
);
console.log(
  '======================================='
);
console.log(
  'Файл: frontend/src/BlockOfficeHome.tsx'
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
  'Формат: МСМ-1560 / СТ-1560 / ИП-1560'
);
console.log(
  'Меняются карточный и табличный виды.'
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
  '.before-v064-o12-v4-' +
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
  'v064-O1.2 v4 применён.'
);
console.log(
  'Изменён только frontend/src/BlockOfficeHome.tsx'
);
console.log(
  'Backup: ' + backup
);
