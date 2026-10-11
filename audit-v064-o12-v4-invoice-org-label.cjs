const fs = require('fs');
const path = require('path');

const root = __dirname;
const target =
  path.join(
    root,
    'frontend',
    'src',
    'BlockOfficeHome.tsx'
  );

console.log('');
console.log(
  'MSM — аудит v064-O1.2 v4'
);
console.log(
  '========================='
);

if (!fs.existsSync(target)) {
  console.log(
    'FAIL BlockOfficeHome.tsx не найден'
  );
  process.exit(1);
}

const text =
  fs.readFileSync(
    target,
    'utf8'
  );

const checks = [
  [
    text.includes(
      'PART_V064_O12_V4_INVOICE_ORG_LABEL'
    ),
    'патч установлен'
  ],
  [
    text.includes(
      "return 'МСМ';"
    ),
    'МСМ'
  ],
  [
    text.includes(
      "return 'СТ';"
    ),
    'СТ'
  ],
  [
    text.includes(
      "return 'ИП';"
    ),
    'ИП'
  ],
  [
    text.includes(
      "sellerType?: 'ST' | 'MSM' | 'IP';"
    ),
    'sellerType у счёта'
  ],
  [
    (
      text.match(
        /invoiceSellerLabel\(/g
      ) || []
    ).length === 3,
    'оба режима списка'
  ],
  [
    !/invoice\s*\?\s*'Счёт №'\s*\+/.test(
      text
    ),
    'старый карточный формат отсутствует'
  ],
  [
    !/invoice\s*\?\s*'№'\s*\+/.test(
      text
    ),
    'старый табличный формат отсутствует'
  ],
];

let failed = false;

for (
  const [ok, label]
  of checks
) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );

  if (!ok) {
    failed = true;
  }
}

console.log('');

if (failed) {
  console.log(
    'ИТОГ: есть ошибки.'
  );
  process.exit(1);
}

console.log(
  'ИТОГ: OK — счёт отображается как МСМ/СТ/ИП + номер.'
);
