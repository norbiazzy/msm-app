const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(rel) {
  const file = path.join(root, rel);

  return fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
    : '';
}

const app =
  read('frontend/src/App.tsx');

const css =
  read('frontend/src/styles.css');

function block(name, nextName) {
  const start =
    app.indexOf(`function ${name}(`);

  let end =
    nextName
      ? app.indexOf(
          `\nfunction ${nextName}(`,
          start + 1
        )
      : -1;

  if (end < 0) {
    end =
      app.indexOf(
        '\nfunction ',
        start + 20
      );
  }

  if (end < 0) {
    end = app.length;
  }

  return start >= 0
    ? app.slice(start, end)
    : '';
}

const home =
  block('Home', 'DealCard');

const card =
  block('DealCard', 'DealDetail');

const detail =
  block('DealDetail', 'InvoiceBlock');

const checks = [
  [
    app.includes(
      'PART_V064_O24_DEAL_LIST_UPLOAD_BINDING'
    ),
    'патч установлен'
  ],
  [
    home.includes(
      'const dealUploadJobFor ='
    ),
    'selector DEAL-upload'
  ],
  [
    home.includes(
      "job.scope === 'DEAL'"
    ),
    'только DEAL origin'
  ],
  [
    home.includes(
      'uploadJob={'
    ) &&
    home.includes(
      'dealUploadJobFor('
    ),
    'карточка получает uploadJob'
  ],
  [
    card.includes(
      'dealUploadState'
    ) &&
    card.includes(
      'uploadJob.progress'
    ),
    'карточка рисует progress'
  ],
  [
    detail.includes(
      'dealGeneralUploadProgress'
    ),
    'progress внутри сделки сохранён'
  ],
  [
    css.includes(
      '.dealWorkspaceCPage > .dealPageUploadProgress'
    ),
    'дубликат внутри сделки скрыт'
  ],
];

console.log('');
console.log(
  'MSM — аудит v064-O2.4'
);
console.log(
  '======================'
);

let bad = false;

for (
  const [ok, label]
  of checks
) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );

  if (!ok) {
    bad = true;
  }
}

console.log('');

if (bad) {
  console.log(
    'ИТОГ: есть ошибки.'
  );
  process.exit(1);
}

console.log(
  'ИТОГ: OK — progress виден на карточке ЗК, внутри сделки нет визуального дубля.'
);
