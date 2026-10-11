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
  'MSM — аудит v064-O1.2 v2'
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
      'PART_V064_O12_V2_INVOICE_ORG_LABEL'
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
      '.sellerType || deal.sellerType'
    ),
    'организация счёта'
  ],
  [
    !/№\s*\{\s*[A-Za-z_$][\w$]*\.number\s*\}/.test(
      text
    ),
    'старый №123 отсутствует'
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
  'ИТОГ: OK — колонка «Счёт» показывает организацию и номер.'
);
