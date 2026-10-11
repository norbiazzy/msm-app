const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(rel) {
  const file =
    path.join(
      root,
      rel
    );

  return fs.existsSync(file)
    ? fs.readFileSync(
        file,
        'utf8'
      )
    : '';
}

const app =
  read('frontend/src/App.tsx');

const uploads =
  read(
    'frontend/src/backgroundUploads.tsx'
  );

const poa =
  read(
    'frontend/src/PowerOfAttorneyBlock.tsx'
  );

const css =
  read('frontend/src/styles.css');

const checks = [
  [
    uploads.includes(
      'PART_V064_O19_V3_UNIFIED_UPLOAD_UX'
    ),
    'единый upload scope'
  ],
  [
    uploads.includes(
      'inferredUploadScope'
    ),
    'route → TASK/DEAL'
  ],
  [
    uploads.includes(
      'inferredTaskId'
    ) &&
    uploads.includes(
      'inferredDealId'
    ),
    'авто taskId/dealId'
  ],
  [
    app.includes(
      'taskUploadInline'
    ),
    'задача показывает progress'
  ],
  [
    app.includes(
      'dealPageUploadProgress'
    ),
    'сделка показывает progress'
  ],
  [
    app.includes(
      'dealUploadState'
    ),
    'список сделок показывает progress'
  ],
  [
    !app.includes(
      "uploadDealFile(deal.id, file, 'CLIENT_PAYMENT')"
    ),
    'нет прямой загрузки оплаты клиента'
  ],
  [
    app.includes(
      "Загружаем подтверждение оплаты"
    ),
    'оплата клиента через background job'
  ],
  [
    css.includes(
      'PART_V064_O19_V3_UNIFIED_UPLOAD_UX'
    ),
    'CSS'
  ],
];

console.log('');
console.log(
  'MSM — аудит v064-O1.9 v3'
);
console.log(
  '======================'
);

let failed = false;

for (const [ok, label] of checks) {
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
  'ИТОГ: OK — TASK прогресс в задачах; DEAL прогресс в сделке и списке сделок.'
);
