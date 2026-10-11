const fs = require('fs');
const path = require('path');

const root = __dirname;
const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

console.log('');
console.log('MSM — аудит v064-O1.4 v2');
console.log('=========================');

if (!fs.existsSync(appPath)) {
  console.log('FAIL App.tsx отсутствует');
  process.exit(1);
}

const app = fs.readFileSync(
  appPath,
  'utf8'
);

const checks = [
  [
    app.includes(
      'PART_V064_O14_V2_CORRECTION_TAKE_BUTTON'
    ),
    'патч установлен'
  ],
  [
    app.includes(
      "'CORRECT_CLIENT_INVOICE' &&"
    ),
    'корректировка счёта'
  ],
  [
    app.includes(
      "status === 'NEW'"
    ),
    'статус NEW'
  ],
  [
    app.includes(
      'onClick={take}'
    ),
    'кнопка вызывает take'
  ],
  [
    app.includes(
      "'IN_PROGRESS'"
    ),
    'переход IN_PROGRESS'
  ],
];

let failed = false;

for (const [ok, label] of checks) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );

  if (!ok) failed = true;
}

console.log('');

if (failed) {
  console.log('ИТОГ: есть ошибки.');
  process.exit(1);
}

console.log(
  'ИТОГ: OK — у новой корректировки есть кнопка «В работу».'
);
