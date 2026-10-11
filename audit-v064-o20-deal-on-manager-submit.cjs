const fs = require('fs');
const path = require('path');

const root = __dirname;

const appPath =
  path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  );

const app =
  fs.existsSync(appPath)
    ? fs.readFileSync(
        appPath,
        'utf8'
      )
    : '';

const start =
  app.indexOf(
    'function NewDealForm('
  );

const endCandidates = [
  app.indexOf(
    '\nfunction TasksView(',
    start + 1
  ),
  app.indexOf(
    '\nfunction ',
    start + 20
  ),
].filter(
  (value) =>
    value > start
);

const end =
  endCandidates.length
    ? Math.min(...endCandidates)
    : app.length;

const block =
  start >= 0
    ? app.slice(start, end)
    : '';

const checks = [
  [
    block.includes(
      'PART_V064_O20_DEAL_ON_MANAGER_SUBMIT'
    ),
    'патч установлен'
  ],
  [
    block.indexOf(
      'await createDeal({'
    ) >= 0 &&
    block.indexOf(
      'await createDeal({'
    ) <
    block.indexOf(
      'startBackgroundUploadJob({'
    ),
    'сначала createDeal'
  ],
  [
    block.includes(
      "Создаём запрос на счёт"
    ),
    'есть progress без файлов'
  ],
  [
    block.includes(
      'await submitInvoiceRequest('
    ),
    'invoice task создаётся'
  ],
  [
    block.indexOf(
      'startBackgroundUploadJob({'
    ) <
    block.indexOf(
      'onCreated();'
    ),
    'сразу переход в список сделок'
  ],
];

console.log('');
console.log(
  'MSM — аудит v064-O2.0'
);
console.log(
  '======================'
);

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
  'ИТОГ: OK — сделка появляется сразу после отправки запроса менеджером.'
);
